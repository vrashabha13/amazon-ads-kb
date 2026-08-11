# Hard Cases Analysis: Pipeline Stage Behavior

## Overview

This document defines the actual behavior of each pipeline stage when encountering three hard cases:
1. **SOURCE CHANGED** - The source has new/different content since last ingest
2. **SOURCES DISAGREE** - Two sources describe the same concept but conflict on facts
3. **SAME SOURCE REPROCESSED** - The source is byte-identical to previously ingested content

For each stage × case combination, this document answers:
- What does this stage actually DO right now (based on current agent instructions)
- What does it read and write
- Is it correct? If not, what's the failure mode?

---

## Stage 1: Scout Agent

### Case 1.1: SOURCE CHANGED

**What happens:**
- Scout fetches content from URL
- Computes SHA-256 hash of fetched content
- Reads `.manifest.json` to find previous hash for this URL
- Compares hashes: they differ
- Returns `{"status": "proceed", ...}` with raw content

**What it reads:**
- `.manifest.json` (to get previous hash)
- Web content from URL

**What it writes:**
- Nothing to disk at this stage
- Returns proceed signal with content in JSON output

**Is this correct?** ✅ **YES**

**Why:** This is exactly correct behavior. The Scout's job is to detect changes and pass along new content. It doesn't need to know what changed, just that something changed.

**Verification:**
```bash
# In manifest: previous_hash = "sha256:abc123"
# New fetch: new_hash = "sha256:def456"
# Scout returns: status=proceed, content=..., content_hash="sha256:def456"
```

---

### Case 1.2: SOURCES DISAGREE

**What happens:**
- Scout fetches content from ONE URL (it only processes one at a time)
- Cannot detect disagreements because it never sees two sources simultaneously
- Returns `{"status": "proceed", ...}` normally

**What it reads:**
- One URL's content
- `.manifest.json` for that URL's previous state

**What it writes:**
- Nothing (conflict detection is not Scout's responsibility)

**Is this correct?** ✅ **YES**

**Why:** Scout is a single-URL fetcher by design. It CANNOT detect conflicts because it only ever sees one source at a time. Conflict detection is Validator's job.

**Verification:**
- Source A says "X = $5"
- Source B says "X = $10"
- Scout fetches Source A → proceeds normally
- Later, Scout fetches Source B → proceeds normally
- Validator compares both and detects conflict

---

### Case 1.3: SAME SOURCE REPROCESSED

**What happens:**
- Scout fetches content from URL
- Computes SHA-256 hash
- Reads `.manifest.json`
- Compares hashes: they match exactly
- Returns `{"status": "skip", "reason": "content_unchanged", ...}`

**What it reads:**
- `.manifest.json` (previous hash)
- Web content from URL

**What it writes:**
- Nothing (early exit, no further processing)

**Is this correct?** ✅ **YES**

**Why:** This is correct and optimal behavior. Hash match = byte-identical content = no need to reprocess. Saves computation time.

**Verification:**
```bash
# First run: hash="sha256:abc123" → proceed → extract → validate → publish
# Second run: hash="sha256:abc123" → skip → entire pipeline skipped
# Result: Zero changes, zero waste
```

**Note from NOTES.md:** Hash changes don't always mean content changes (dynamic elements). Validator provides semantic-level duplicate detection as a safety net.

---

## Stage 2: Extractor Agent

### Case 2.1: SOURCE CHANGED

**What happens:**
- Extractor receives raw content from Scout (because hash differed)
- Analyzes content to identify factual statements
- Filters out marketing fluff, testimonials, subjective claims
- Extracts specific, verifiable facts
- Attaches provenance (source_url, source_excerpt, confidence, timestamp) to EACH fact
- Returns structured fact list

**What it reads:**
- Raw content from Scout
- Skills (`okf-formatter`, `provenance`) for extraction rules

**What it writes:**
- Nothing to disk
- Returns fact list in JSON output

**Is this correct?** ✅ **YES**

**Why:** Extractor's job is to extract facts from whatever content it receives. It doesn't need to know if content changed - it just extracts facts from what it gets.

**Verification:**
```json
{
  "facts": [
    {
      "statement": "Sponsored Products use cost-per-click pricing",
      "confidence": "high",
      "source_url": "https://...",
      "source_excerpt": "Sponsored Products use cost-per-click (CPC) pricing...",
      "extraction_timestamp": "2026-08-10T20:26:36Z"
    }
  ]
}
```

---

### Case 2.2: SOURCES DISAGREE

**What happens:**
- Extractor receives content from ONE source
- Extracts facts from that source
- Never sees the other source, so can't detect disagreement
- Returns fact list normally

**What it reads:**
- Content from one source

**What it writes:**
- Nothing (conflict detection is Validator's job)

**Is this correct?** ✅ **YES**

**Why:** Extractor processes one source at a time. It CANNOT detect conflicts because it never sees multiple sources simultaneously. This is correct separation of concerns.

**Verification:**
- Source A extracted: "Minimum bid is $0.02"
- Source B extracted (separate run): "Minimum bid is $0.05"
- Validator compares both and flags conflict

---

### Case 2.3: SAME SOURCE REPROCESSED

**What happens:**
- Scout skips (hash match) → Extractor never runs
- Pipeline early exits at Scout stage

**What it reads:**
- Nothing (doesn't run)

**What it writes:**
- Nothing (doesn't run)

**Is this correct?** ✅ **YES**

**Why:** Early exit is correct. No need to waste resources reprocessing identical content.

---

## Stage 3: Validator Agent

### Case 3.1: SOURCE CHANGED ⚠️ **PROBLEMATIC**

**What happens:**
- Validator receives new fact list from Extractor (from changed source)
- Searches for existing concepts with matching tags/titles
- Compares new facts against existing facts
- Detects: duplicates (skip), conflicts (flag), new facts (proceed)
- **PROBLEM:** No mechanism to UPDATE or REMOVE existing facts that are now outdated
- Returns validation report with `new_facts`, `duplicates`, `conflicts`
- **MISSING:** No `facts_to_update` field, no `facts_to_remove` field

**What it reads:**
- Existing concept files from `knowledge/concepts/`
- New fact list from Extractor
- Skills (`dedup-merge`, `provenance`)

**What it writes:**
- Nothing to disk
- Returns validation report in JSON

**Is this correct?** ❌ **NO - INCOMPLETE**

**Failure Mode:** When a source changes:
- Old facts remain in concepts (never removed/updated)
- New facts are added alongside old facts
- Result: Duplicate, contradictory, or outdated facts accumulate

**Example Failure Scenario:**
```
# Initial ingest (Source v1.0):
Fact: "Sponsored Products support 10 products per ad"

# Source updated (Source v1.1):
New Fact: "Sponsored Products support 50 products per ad"

# What Validator does:
- Detects as "new fact" (not exact duplicate)
- Recommends: proceed with new fact

# What SHOULD happen:
- Detect: old fact is superseded by new fact
- Output: facts_to_remove = [old_fact_id]
- Output: facts_to_add = [new_fact]
- Output: supersedes = {new_fact_id: old_fact_id}

# Actual result:
- Concept now has BOTH facts:
  - "Sponsored Products support 10 products per ad"
  - "Sponsored Products support 50 products per ad"
- Reader doesn't know which is current
```

**Why this is missing:**
- Current design assumes additive knowledge accumulation
- No fact lifecycle management (create, update, delete)
- No "supersedes" tracking

---

### Case 3.2: SOURCES DISAGREE

**What happens:**
- Validator receives fact lists from multiple sources
- Compares facts from Source A against facts from Source B
- Detects contradictions: "Supports X" vs "Does NOT support X"
- Flags as `status: "conflict"` with `resolution: "manual_review"`
- Applies priority rules: official > unofficial, higher confidence > lower
- Returns validation report with conflicts flagged

**What it reads:**
- Existing concepts
- New facts from both sources
- Skills for conflict resolution rules

**What it writes:**
- Nothing to disk
- Returns validation report

**Is this correct?** ✅ **YES (with limitations)**

**Why:** This is the correct job for Validator. It detects conflicts and flags them for manual review or applies priority rules.

**Limitations:**
- When both sources are official and contradict → flags for manual review (correct)
- When official vs unofficial → official wins (correct)
- No automated resolution for official-official conflicts (intentional - requires human)

**Example:**
```
# Conflict detection:
Source A (official): "Minimum bid is $0.02"
Source B (unofficial): "Minimum bid is $0.05"
→ Validator: Official wins, keep $0.02

Source A (official guide): "Minimum budget is $1"
Source B (official API docs): "Minimum budget is $10"
→ Validator: Both official, flag for manual review
```

---

### Case 3.3: SAME SOURCE REPROCESSED

**What happens:**
- Scout skips (hash match) → Validator never runs
- Pipeline early exits at Scout stage

**What it reads:**
- Nothing (doesn't run)

**What it writes:**
- Nothing (doesn't run)

**Is this correct?** ✅ **YES**

**Why:** Early exit is correct. No need to re-validate identical content.

---

## Stage 4: Merger Agent

### Case 4.1: SOURCE CHANGED ⚠️ **PROBLEMATIC**

**What happens:**
- Merger receives Validator's report with `new_facts` (from changed source)
- Reads existing concept files
- Groups concepts by hierarchical tags
- Detects merge candidates (semantic similarity ≥70%, fact overlap ≥50%)
- **PROBLEM:** No mechanism to UPDATE existing concepts based on source changes
- **PROBLEM:** No `facts_to_remove` handling from Validator
- Merges new facts into existing concepts (additive only)
- Returns merged concept documents

**What it reads:**
- Existing concept files
- Validator's report (missing `facts_to_remove` field)
- Skills (`dedup-merge`, `okf-formatter`)

**What it writes:**
- Merged concept documents (in memory, not written to disk)
- No actual updates to existing concepts

**Is this correct?** ❌ **NO - INCOMPLETE**

**Failure Mode:** When a source changes:
- Merger treats all new facts as additive
- Old facts are never removed or marked as superseded
- Concepts accumulate stale, outdated, or contradictory facts
- No way to track which facts are current vs obsolete

**Example Failure Scenario:**
```
# Initial state:
Concept: "sponsored-products-limits.okf.md"
Facts:
- "Maximum 10 products per ad" (from Source v1.0)
- "Maximum 5 campaigns" (from Source v1.0)

# Source updated to v1.1:
Validator detects: 1 new fact, 0 duplicates, 0 conflicts
Merger receives: new_facts = ["Maximum 50 products per ad"]

# What Merger does:
- Adds new fact to concept
- Concept now has:
  - "Maximum 10 products per ad" (OUTDATED)
  - "Maximum 50 products per ad" (CURRENT)
  - "Maximum 5 campaigns" (still valid)

# What SHOULD happen:
- Validator should identify: "Maximum 10 products" is superseded by "Maximum 50 products"
- Validator should output: facts_to_remove = ["Maximum 10 products"]
- Merger should remove outdated fact, add new fact
- Add tracking: supersedes = {new_fact_id: old_fact_id}
```

**Why this is missing:**
- Validator doesn't output `facts_to_remove` or `supersedes` fields
- Merger has no logic to handle fact updates/removals
- No fact ID system to track individual facts across versions

---

### Case 4.2: SOURCES DISAGREE

**What happens:**
- Merger receives Validator's report with `conflicts` flagged
- Reads conflicting concepts
- Applies conflict resolution priority:
  1. Official source > unofficial source
  2. Higher confidence > lower confidence
  3. Both official → flag for manual review
- Resolves conflicts by keeping winner, noting loser in `merge_notes`
- Returns merged concepts with conflicts resolved

**What it reads:**
- Conflicting concept files
- Validator's conflict report
- Skills for conflict resolution rules

**What it writes:**
- Merged concepts with resolved conflicts
- `merge_notes` documenting conflicts and resolutions

**Is this correct?** ✅ **YES**

**Why:** This is the correct job for Merger. It applies deterministic rules to resolve conflicts and documents everything.

**Example:**
```
# Conflict:
Source A (official): "Minimum bid $0.02"
Source B (unofficial): "Minimum bid $0.05"

# Merger resolution:
- Keep: "Minimum bid $0.02" (official wins)
- Add merge_notes: "Unofficial source claimed $0.05, official source confirmed $0.02"
- Result: Single correct fact with documentation
```

---

### Case 4.3: SAME SOURCE REPROCESSED

**What happens:**
- Scout skips (hash match) → Merger never runs
- Pipeline early exits at Scout stage

**What it reads:**
- Nothing (doesn't run)

**What it writes:**
- Nothing (doesn't run)

**Is this correct?** ✅ **YES**

**Why:** Early exit is correct. No need to re-merge identical content.

---

## Stage 5: Publisher Agent

### Case 5.1: SOURCE CHANGED

**What happens:**
- Publisher receives merged concept documents from Merger
- (Note: These include new facts added by Merger)
- Writes concept files to `knowledge/concepts/`
- Hook (`validate-okf-frontmatter`) validates OKF frontmatter
- Updates `index.md` (alphabetical list of all concepts)
- Updates `log.md` (ingestion history entry)
- Updates `.manifest.json` (new hash, last_checked timestamp, concept_files list)
- Returns success confirmation

**What it reads:**
- Merged concept documents from Merger
- Existing `index.md`, `log.md`, `.manifest.json`

**What it writes:**
- Concept files to `knowledge/concepts/`
- Updated `index.md`
- Updated `log.md`
- Updated `.manifest.json`

**Is this correct?** ⚠️ **PARTIALLY**

**Why partially correct:** Publisher does its job correctly (writing files, updating indices), but it's writing concepts that may contain outdated facts because earlier stages (Validator/Merger) don't handle updates properly.

**What Publisher does correctly:**
- ✅ Writes concept files with proper OKF format
- ✅ Validates frontmatter via hook
- ✅ Updates all indices
- ✅ Updates manifest with new hash and timestamp

**What Publisher can't fix:**
- ❌ Can't remove outdated facts (not its responsibility)
- ❌ Can't know which facts are current vs obsolete (that's Validator/Merger's job)

**Result:** Publisher correctly writes files, but those files may contain stale facts due to upstream limitations.

---

### Case 5.2: SOURCES DISAGREE

**What happens:**
- Publisher receives merged concepts with resolved conflicts
- Writes concept files
- Hook validates frontmatter
- Conflicts are already resolved by Merger (official wins, or flagged in `merge_notes`)
- Updates indices and manifest
- Returns success

**What it reads:**
- Merged concepts (conflicts already resolved)

**What it writes:**
- Concept files with conflict resolutions documented
- Updated indices

**Is this correct?** ✅ **YES**

**Why:** Publisher's job is to write files. Conflict resolution happened upstream (Merger). Publisher writes the resolved state correctly.

**Verification:**
```yaml
# Concept file:
merge_notes:
  - "Conflict: Unofficial source claimed $0.05, official confirmed $0.02"
# Publisher writes this correctly
```

---

### Case 5.3: SAME SOURCE REPROCESSED

**What happens:**
- Scout skips (hash match) → Publisher never runs
- Pipeline early exits at Scout stage

**What it reads:**
- Nothing (doesn't run)

**What it writes:**
- Nothing (doesn't run)

**Is this correct?** ✅ **YES**

**Why:** Early exit is correct. No need to re-write identical files.

---

## Summary: What Works vs What's Broken

### ✅ Works Correctly (11/15 cases)

**Scout, Extractor, Publisher** handle all cases correctly:
- SOURCE CHANGED: Properly detect and process
- SOURCES DISAGREE: Not their responsibility (correct)
- SAME SOURCE REPROCESSED: Correctly skip (early exit)

**Validator** handles SOURCES DISAGREE correctly:
- Detects conflicts and applies priority rules
- Flags for manual review when needed

**Merger** handles SOURCES DISAGREE correctly:
- Applies conflict resolution rules
- Documents resolutions in merge_notes

### ❌ Broken/Incomplete (4/15 cases)

**Validator** SOURCE CHANGED:
- ❌ Can't update existing facts (only adds new ones)
- ❌ Can't mark facts as superseded or obsolete
- ❌ No `facts_to_update` or `facts_to_remove` output fields
- ❌ No fact ID system to track individual facts

**Merger** SOURCE CHANGED:
- ❌ Treats all facts as additive (no removal logic)
- ❌ No mechanism to handle `facts_to_remove` from Validator
- ❌ Can't track fact supersedence (Fact A replaced Fact B)
- ❌ Concepts accumulate stale/outdated facts

**Publisher** SOURCE CHANGED:
- ⚠️ Does its job correctly but writes potentially incomplete concepts
- ⚠️ Can't fix upstream limitations

---

## Root Cause Analysis

### Design Gap: No Fact Lifecycle Management

The current pipeline was designed for **additive knowledge accumulation**:
- Facts are only ever ADDED, never UPDATED or REMOVED
- No tracking of fact versioning or supersedence
- No mechanism to deprecate outdated facts

### What's Missing

1. **Fact IDs**: No stable identifiers to track facts across versions
2. **Supersedence Tracking**: No way to record "Fact A replaced Fact B"
3. **Update Detection**: No logic to identify when a new fact supersedes an old one
4. **Removal Logic**: No mechanism to delete facts from concepts
5. **Change Semantics**: No way to distinguish "add new fact" from "update existing fact"

### Current Behavior vs Required Behavior

| Scenario | Current Behavior | Required Behavior |
|----------|-----------------|-------------------|
| Source updates a fact | Add as new fact (now have duplicate) | Replace old fact, track supersedence |
| Source removes a fact | Keep old fact (now stale) | Remove fact, track deprecation |
| Source changes a value | Add as new fact (now contradictory) | Update fact, track change history |
| Multiple sources conflict | Flag for manual review | ✅ Works correctly |
| Same source reprocessed | Skip entire pipeline | ✅ Works correctly |

---

## Impact on Data Correctness

### What Stays Correct (Why system still works partially)

1. **SOURCES DISAGREE**: Conflicts are detected and resolved correctly
2. **SAME SOURCE REPROCESSED**: Idempotency works (no duplicate processing)
3. **Initial ingestion**: First-time ingest works perfectly
4. **Semantic duplicates**: Validator prevents re-creation of semantically identical content

### What Breaks Over Time

1. **Stale facts accumulate**: Old facts never removed when sources change
2. **Contradictory facts**: Multiple versions of "same" fact coexist
3. **No current vs obsolete distinction**: Readers can't tell which fact is current
4. **Audit trail missing**: Can't see fact evolution history
5. **Trust degrades**: Knowledge base becomes less reliable over time

### Example of Data Corruption

```
# Timeline of a single concept:

Day 1 (Source v1.0):
- Fact: "Maximum 10 products per ad"
- Status: Correct

Day 30 (Source v1.1 - updated):
- Old Fact: "Maximum 10 products per ad" (STALE)
- New Fact: "Maximum 50 products per ad" (CURRENT)
- Status: Contradictory, unclear which is true

Day 60 (Source v1.2 - updated again):
- Old Fact 1: "Maximum 10 products per ad" (STALE)
- Old Fact 2: "Maximum 50 products per ad" (STALE)
- New Fact: "Maximum 100 products per ad" (CURRENT)
- Status: Three contradictory facts, no indication which is current

# Reader sees: "Which is true? 10, 50, or 100?"
# System provides: No way to know
```

---

## Required Fixes

### Fix 1: Add Fact ID System

Add to `dedup-merge` skill:
- Each fact gets a stable ID based on source + statement hash
- Format: `fact-{source_hash}-{statement_hash}`
- Allows tracking same fact across versions

### Fix 2: Add Supersedence Tracking

Add to Validator agent:
- New output field: `supersedes` - map of {new_fact_id: old_fact_id}
- New output field: `facts_to_remove` - list of fact IDs to delete
- Logic: Detect when new fact replaces old fact (same topic, different value)

### Fix 3: Add Update Logic to Merger

Add to Merger agent:
- Accept `facts_to_remove` and `supersedes` from Validator
- Remove outdated facts from concepts
- Add `supersedes` metadata to show fact lineage
- Update `last_checked` timestamp

### Fix 4: Add Deprecation Notes

Add to OKF formatter skill:
- New optional field: `deprecated_facts` - list of removed facts with timestamps
- New optional field: `fact_history` - show evolution of facts over time
- Format: Track when facts were added, updated, removed

---

## Verification Test Cases

### Test 1: SOURCE CHANGED - Value Update

**Setup:**
1. Ingest Source v1.0 with fact "X = 10"
2. Update Source to v1.1 with fact "X = 20"
3. Re-ingest

**Expected behavior (after fixes):**
- Validator detects: "X = 20" supersedes "X = 10"
- Validator outputs: `facts_to_remove = ["fact-...X10"]`, `supersedes = {...}`
- Merger removes "X = 10", adds "X = 20"
- Concept shows only current fact

**Current behavior (broken):**
- Validator treats "X = 20" as new fact
- Merger adds both facts
- Concept shows "X = 10" and "X = 20" (contradictory)

### Test 2: SOURCE CHANGED - Fact Removed

**Setup:**
1. Ingest Source v1.0 with fact "Feature Y is supported"
2. Update Source to v1.1 (fact removed from page)
3. Re-ingest

**Expected behavior (after fixes):**
- Validator detects: fact no longer in source
- Validator outputs: `facts_to_remove = ["fact-...featureY"]`
- Merger removes fact from concept

**Current behavior (broken):**
- Validator doesn't detect removal
- Fact remains in concept (now stale)

### Test 3: SOURCES DISAGREE - Official vs Unofficial

**Setup:**
1. Source A (official): "X = 10"
2. Source B (unofficial): "X = 20"

**Expected behavior (works now):**
- Validator detects conflict
- Merger keeps official source fact
- Result: "X = 10" with note about conflicting claim

**Current behavior:** ✅ Works correctly

### Test 4: SAME SOURCE REPROCESSED

**Setup:**
1. Ingest Source
2. Re-ingest same Source (no changes)

**Expected behavior (works now):**
- Scout detects hash match
- Early exit, no processing
- Zero changes to knowledge base

**Current behavior:** ✅ Works correctly

---

## Conclusion

### Current State: Partially Correct (11/15 cases)

**What works:**
- Change detection (Scout)
- Fact extraction (Extractor)
- Conflict detection between sources (Validator)
- Conflict resolution (Merger)
- File writing and indexing (Publisher)
- Idempotency for unchanged sources

**What's broken:**
- Fact updates when sources change (Validator + Merger)
- Fact removal when sources change (Validator + Merger)
- Fact supersedence tracking (missing feature)
- Fact lifecycle management (missing feature)

### Why This Matters

The interviewer's feedback is correct: **"This is the core of the assignment"** because:

1. **Real-world sources change**: Documentation updates frequently
2. **Stale facts are dangerous**: Readers act on outdated information
3. **Trust degrades**: Contradictory facts make the knowledge base unreliable
4. **No fix-up mechanism**: Once bad data is in, it's hard to remove

### Path Forward

Implement the 4 fixes:
1. Add fact ID system
2. Add supersedence tracking to Validator
3. Add update/removal logic to Merger
4. Add deprecation tracking to OKF format

This will make all 15 cases work correctly, ensuring data stays accurate as sources evolve.

---

**Last Updated:** 2026-08-11T00:00:00Z
**Version:** 1.0.0
**Status:** Analysis complete, fixes pending
