# Deduplication & Merge Skill

**Purpose**: Define when two facts/concepts are "the same" and how to merge them

**Used by**: Validator, Merger

## Same Concept Detection

### Primary: Semantic Similarity (≥70%)
Compare concept titles/names using semantic understanding.
- Threshold: ≥70% similarity → merge candidate
- Example: "Sponsored Products Bidding" ≈ "Bidding for Sponsored Products"

### Secondary: Fact Set Overlap (≥50%)
Compute Jaccard similarity of fact sets.
- Formula: |intersection| / |union|
- Threshold: ≥50% overlap → strong merge signal

### Tertiary: Hierarchical Tag Matching
Group concepts by hierarchical tag paths.
- Exact path match → same tag group → compare for merging
- Example: Both tagged with `products/sponsored-products/bidding` → likely related

## Conflict Resolution Rules

### Priority Order
1. **Official source wins**: amazon.com/docs > unofficial
2. **Higher confidence wins**: When equal officialness, higher confidence prevails
3. **Manual review flag**: When two official sources contradict, add note but keep both

### Flag for Manual Review
When ANY of these occur:
- Two official sources contradict each other
- Semantic similarity ≥70% but fact overlap <50%
- Fact overlap ≥50% but semantic similarity <70%

Add to frontmatter:
```yaml
merge_notes:
  - "Conflict detected: Source A says X, Source B says Y. Manual review needed."
```

## Merge Procedure

### Step 1: Combine Fact Sets
- Union all facts from both concepts
- Target: 5-10 related facts per concept document
- If >15 facts: Consider splitting into multiple concepts

### Step 2: Union Tags
- Combine all unique hierarchical tags
- Sort alphabetically for consistency

### Step 3: Keep Highest Confidence Per Fact
- If same fact appears in both sources, keep highest confidence
- If same fact with different content: Flag for manual review

### Step 4: Update Frontmatter
- Increment `sources_count`
- Update `last_checked` to current timestamp
- Add `merge_notes` if any conflicts flagged
- Add `deprecated_facts` if any facts were removed
- Add `fact_history` if any facts were updated

### Step 5: Write Merged Document
- Follow OKF formatter skill
- Preserve both source URLs in `sources` array
- Add merge note to body if conflicts exist

---

## Source Change Handling (NEW)

### Detect Fact Updates

When a source changes, detect which facts should be updated:

**Update Criteria:**
- Same source URL (not a conflict between sources)
- Same concept/topic (semantic similarity ≥80%)
- Different value/number/limit

**Examples of updates:**
- Old: "Maximum 10 products per ad"
- New: "Maximum 50 products per ad"
- Same source, same topic, different value → UPDATE

**NOT an update:**
- Source A: "Maximum 10 products per ad"
- Source B: "Maximum 50 products per ad"
- Different sources → CONFLICT (use conflict resolution)

### Detect Fact Removals

When a source changes, detect which facts should be removed:

**Removal Criteria:**
- Fact was present in previous version of this source
- Fact is NOT present in new version of this source
- Same source URL (proving it's a removal, not a conflict)

**Examples of removals:**
- Old content mentions "Feature X is available"
- New content doesn't mention Feature X at all
- Feature X truly removed from source → REMOVE fact

**NOT a removal:**
- Fact is still present but reworded
- Fact is present in different section
- Check semantic similarity ≥80% before classifying as removal

### Fact ID System

Generate stable fact IDs for tracking across versions:

**Format:**
```
fact-{source_short_hash}-{statement_short_hash}
```

**Example:**
- Source URL: `https://advertising.amazon.com/solutions/products/sponsored-products`
- Source hash: `sha256:abc123def456...` → `abc123`
- Statement: "Maximum 10 products per ad"
- Statement hash: `sha256:xyz789uvw012...` → `xyz789`
- Fact ID: `fact-abc123-xyz789`

**Benefits:**
- Stable across source versions
- Enables supersedence tracking
- Allows audit trail

### Supersedence Tracking

Track which facts replace which:

**Format:**
```yaml
fact_history:
  fact-new50-new51:
    current_statement: "Maximum 50 products per ad"
    supersedes: "fact-abc123-xyz789"
    previous_statement: "Maximum 10 products per ad"
    updated_at: "2026-08-11T00:00:00Z"
```

**Usage:**
- Merger adds this to concept frontmatter when updating facts
- Shows evolution of facts over time
- Preserves audit trail

### Deprecated Facts Tracking

Track removed facts for audit trail:

**Format:**
```yaml
deprecated_facts:
  - fact_id: "fact-abc123-xyz789"
    statement: "Maximum 10 products per ad"
    removed_at: "2026-08-11T00:00:00Z"
    reason: "Source updated, value changed to 50"
```

**Usage:**
- Merger adds this to concept frontmatter when removing facts
- Shows what was removed and why
- Preserves historical context

## Example Merge

**Before:**
- Concept A: "SP Bidding" (3 facts, confidence: high)
- Concept B: "Bidding Strategies" (2 facts, confidence: medium)

**After:**
- Concept: "Sponsored Products Bidding Strategies" (5 facts, confidence: high)
- Sources: both A and B URLs
- Tags: union of both tag sets
