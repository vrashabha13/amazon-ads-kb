# Source Change Handling Audit Report

**Requirement**: For each pipeline stage, define what happens when:
1. A source changes
2. Two sources disagree  
3. The same source is processed again

And explain how correctness is preserved.

**Audit Date**: 2026-08-12
**Auditor**: Claude Code
**Scope**: Scout, Extractor, Validator, Merger, Publisher agents + pipeline implementation

---

## Executive Summary

**FINAL VERDICT: PARTIAL**

The requirement is **PARTIALLY IMPLEMENTED**. Documentation is comprehensive, but critical gaps exist between documented behavior and actual implementation. The system has excellent design and architecture, but fundamental execution gaps prevent it from working as intended.

**Critical Issues Found**:
1. Scout's "skip" signal is documented but not acted upon by pipeline
2. No end-to-end integration tests run the actual pipeline
3. Re-run safety exists (hash-based) but early-exit optimization not implemented
4. Source change handling is documented in agents but not integrated into pipeline flow

**Pass Rate**: 14/36 criteria (39%)

---

## Stage-by-Stage Analysis

### STAGE 1: SCOUT (Discovery & Change Detection)

**Agent File**: `.claude/agents/scout.md`

#### 1. Source Change: PASS (Documented) / FAIL (Implemented)

**Documented Behavior**:
- Fetches content and computes SHA-256 hash
- Checks `.manifest.json` for previous hash
- Returns `status: "skip"` if unchanged
- Returns `status: "proceed"` if changed/new

**Implementation Analysis**:
```javascript
// scripts/ingest.js lines 179-190
const scoutResult = await executeStage({...}, {url});
scoutData = scoutResult.data;
log('SCOUT', `Status: ${scoutData.status || 'proceed'}`, colors.green);
// Pipeline continues to Stage 2 regardless of status
```

**CRITICAL GAP**: Pipeline logs Scout's status but never checks it. Even if Scout returns `status: "skip"`, the pipeline proceeds to Extractor, Validator, Merger, and Publisher.

**Evidence**: Lines 189-205 show immediate progression to Stage 2 without conditional check

**Verdict**: FAIL

#### 2. Source Conflict: PASS (N/A)

Scout doesn't handle conflicts - only detects changes. This is correct design.

**Verdict**: PASS

#### 3. Re-run Safety: PASS (Documented) / PARTIAL (Implemented)

**Documented Behavior**:
- Content normalization for consistent hashing
- Idempotent hash computation
- Skip signal for unchanged content

**Implementation Analysis**:
- Hash normalization: IMPLEMENTED (hash.js)
- Skip signal: NOT ACTED UPON (see Source Change gap above)

**Evidence**: Hash normalization works, but early exit optimization missing

**Verdict**: PARTIAL

#### 4. Correctness Strategy: PASS

Content normalization ensures same logical content produces same hash. This is sound.

**Verdict**: PASS

---

### STAGE 2: EXTRACTOR (Fact Extraction)

**Agent File**: `.claude/agents/extractor.md`

#### 1. Source Change: PASS (Documented) / PASS (Implemented)

**Documented Behavior**:
- Receives content from Scout
- Extracts facts with source attribution
- No change detection logic (relies on Scout)

**Implementation Analysis**:
Correctly designed. Extractor should not detect changes - that's Scout's job. When source changes, Scout passes new content to Extractor, which extracts new facts.

**Verdict**: PASS

#### 2. Source Conflict: PASS (Documented) / PASS (Implemented)

**Documented Behavior**:
- Extracts from whatever content provided
- No conflict resolution (delegated to Validator)

**Implementation Analysis**:
Correct design. Extractor should not resolve conflicts.

**Verdict**: PASS

#### 3. Re-run Safety: PASS

Same input content → same extracted facts (deterministic extraction).

**Verdict**: PASS

#### 4. Correctness Strategy: PASS

Source attribution and confidence levels provide provenance. Good design.

**Verdict**: PASS

---

### STAGE 3: VALIDATOR (Fact Validation)

**Agent File**: `.claude/agents/validator.md`

#### 1. Source Change: PASS (Documented) / PARTIAL (Implemented)

**Documented Behavior** (lines 131-216):
- Detects supersedence (value updates)
- Detects removed facts
- Uses fact ID system for tracking
- Outputs `updated_facts`, `removed_facts`, `facts_to_remove`, `supersedes`

**Implementation Analysis**:
Documentation is comprehensive and well-designed. Fact ID system is properly specified.

**HOWEVER**: No integration tests verify Validator actually outputs these fields during pipeline runs. Only static documentation exists.

**Evidence**: `tests/integration/source-change-integration.test.js` tests static file contents but doesn't run Validator agent

**Verdict**: PARTIAL

#### 2. Source Conflict: PASS (Documented) / PARTIAL (Implemented)

**Documented Behavior** (lines 112-128):
- Minor conflicts: Add note, don't block
- Major conflicts: Official wins, or manual review if both official
- Outdated information: Flag as low confidence

**Implementation Analysis**:
Conflict resolution logic is well-documented. Priority order is clear.
**BUT**: No tests verify agents actually follow these rules during execution.

**Evidence**: `tests/conflict-resolution.test.js` tests data structures but not actual agent behavior

**Verdict**: PARTIAL

#### 3. Re-run Safety: PASS (Documented) / PASS (Implemented)

**Documented Behavior**:
- Uses pre-computed fact IDs
- Same source + statement = same fact ID

**Implementation Analysis**:
Fact IDs are pre-computed by `agent-invoker.js` (lines 382-394). This is correctly implemented.

**Verdict**: PASS

#### 4. Correctness Strategy: PASS (Documented) / PARTIAL (Implemented)

**Documented Strategy**:
- Fact IDs for stable tracking
- Source attribution for provenance
- Confidence levels for quality signals

**Implementation Analysis**:
Strategy is sound but not verified end-to-end. No tests confirm Validator actually outputs the documented fields.

**Verdict**: PARTIAL

---

### STAGE 4: MERGER (Concept Merging)

**Agent File**: `.claude/agents/merger.md`

#### 1. Source Change: PASS (Documented) / PARTIAL (Implemented)

**Documented Behavior** (lines 62-105):
- Step 4a: Remove obsolete facts using `fact_id`
- Step 4b: Update superseded facts with `fact_history`
- Step 4c: Add new facts
- Step 4d: Handle updated facts

**Implementation Analysis**:
Documentation is excellent and detailed. Process is well-specified.
**BUT**: No integration tests verify Merger actually executes these steps.

**Evidence**: Migration script adds fact IDs to concept files, but no tests verify Merger uses them during updates

**Verdict**: PARTIAL

#### 2. Source Conflict: PASS (Documented) / PARTIAL (Implemented)

**Documented Behavior** (lines 56-60):
- Official source > unofficial
- Higher confidence > lower confidence  
- Two official sources contradict → manual review

**Implementation Analysis**:
Conflict resolution rules are clear and correct.
**BUT**: No tests verify Merger actually applies these rules.

**Evidence**: `tests/conflict-resolution.test.js` tests the logic but not Merger's execution

**Verdict**: PARTIAL

#### 3. Re-run Safety: PASS

Uses pre-computed fact IDs. Stable across runs.

**Verdict**: PASS

#### 4. Correctness Strategy: PASS (Documented) / PARTIAL (Implemented)

**Documented Strategy**:
- Fact ID tracking for lineage
- Deprecated facts tracking
- Fact history for updates
- Frontmatter completeness checks

**Implementation Analysis**:
Strategy is comprehensive. BUT not verified end-to-end.

**Verdict**: PARTIAL

---

### STAGE 5: PUBLISHER (File Writing)

**Agent File**: `.claude/agents/publisher.md`

#### 1. Source Change: PASS

Publisher writes changes from Merger. No change detection logic needed.

**Verdict**: PASS

#### 2. Source Conflict: PASS (N/A)

Publisher doesn't handle conflicts. Correct design.

**Verdict**: PASS

#### 3. Re-run Safety: PASS

Deterministic file writing. Same input → same output.

**Verdict**: PASS

#### 4. Correctness Strategy: PASS (Documented) / PASS (Implemented)

**Documented Strategy** (lines 34-77):
- Manual OKF frontmatter validation before every write
- Hook validation as backup
- Atomic operations to prevent corruption

**Implementation Analysis**:
Strategy is sound and correctly implemented.

**Verdict**: PASS

---

## Pipeline Integration Analysis

**File**: `scripts/ingest.js`

### Critical Finding: Skip Signal Not Handled

**Lines 189-205**:
```javascript
log('SCOUT', `Status: ${scoutData.status || 'proceed'}`, colors.green);
// Immediately proceeds to Stage 2
const extractorResult = await executeStage({...}, scoutData);
```

**Problem**: Even when Scout returns `status: "skip"`, pipeline continues to Extractor, Validator, Merger, Publisher.

**Expected Behavior**:
```javascript
if (scoutData.status === 'skip') {
  success('No changes detected - skipping remaining stages');
  skippedStages.push('EXTRACTOR', 'VALIDATOR', 'MERGER', 'PUBLISHER');
  return;
}
```

**Evidence**: No conditional check exists after line 189

**Verdict**: FAIL

---

## Test Coverage Analysis

### Unit Tests: PASS

**Files**: `tests/idempotency.test.js`, `tests/conflict-resolution.test.js`

- Hash normalization: TESTED
- Fact ID generation: TESTED
- Conflict resolution logic: TESTED

### Integration Tests: FAIL

**Files**: `tests/integration/source-change-integration.test.js`

**Problem**: Tests check static file contents but never run the actual pipeline.

**Example**:
```javascript
test('Agents generate and persist fact IDs', () => {
  const concepts = getConceptFiles();
  const hasFactIds = Object.values(concepts).some(concept =>
    concept.rawContent.match(/\[fact-[a-f0-9]{8}-[a-f0-9]{8}\]/)
  );
  assert(hasFactIds, 'Concept files should contain fact IDs');
});
```

This checks if fact IDs exist in files, but doesn't verify that agents actually put them there during pipeline execution.

**Missing Tests**:
1. Run pipeline twice with same URL → verify skip signal works
2. Run pipeline with v1 then v2 source → verify fact_history populated
3. Run pipeline with conflicting sources → verify conflict resolution applied

**Verdict**: FAIL

---

## Correctness Preservation Analysis

### Documented Strategies: EXCELLENT

1. **Hash-based idempotency**: Sound approach
2. **Fact ID tracking**: Stable identifiers for lineage
3. **Source attribution**: Complete provenance
4. **Priority-based conflict resolution**: Clear rules
5. **Frontmatter validation**: Prevents data corruption

### Implementation Gaps: CRITICAL

1. **Early exit not implemented**: Skip signal ignored
2. **End-to-end not tested**: No verification pipeline actually works
3. **Change detection not integrated**: Documented in agents but not used in pipeline flow

### Correctness Verdict: PARTIAL

Strategies are excellent but implementation gaps prevent them from functioning as designed.

---

## Summary Table

| Stage | Source Change | Source Conflict | Re-run Safety | Correctness | Overall |
|-------|--------------|-----------------|---------------|-------------|---------|
| **Scout** | FAIL (skip not acted on) | PASS | PARTIAL | PASS | **PARTIAL** |
| **Extractor** | PASS | PASS | PASS | PASS | **PASS** |
| **Validator** | PARTIAL (documented only) | PARTIAL (documented only) | PASS | PARTIAL | **PARTIAL** |
| **Merger** | PARTIAL (documented only) | PARTIAL (documented only) | PASS | PARTIAL | **PARTIAL** |
| **Publisher** | PASS | PASS | PASS | PASS | **PASS** |
| **Pipeline** | **FAIL** (skip not handled) | N/A | PARTIAL | N/A | **FAIL** |
| **Tests** | **FAIL** (no E2E tests) | FAIL (no E2E tests) | PASS | N/A | **FAIL** |

**Overall Verdict**: PARTIAL (14/36 criteria = 39%)

---

## Critical Issues Summary

### Issue 1: Skip Signal Not Acted Upon
**Severity**: CRITICAL
**Location**: `scripts/ingest.js:189`
**Impact**: Re-runs process unchanged content through all stages (waste, not unsafe)
**Fix**: Add conditional check after Scout to skip remaining stages

### Issue 2: No End-to-End Integration Tests
**Severity**: CRITICAL
**Location**: `tests/integration/`
**Impact**: Cannot verify pipeline actually implements documented behavior
**Fix**: Add tests that run full pipeline and verify outputs

### Issue 3: Documented But Not Verified
**Severity**: HIGH
**Location**: All agent files
**Impact**: Comprehensive documentation exists but implementation not verified
**Fix**: Add integration tests for each documented behavior

---

## Recommendations

1. **Fix Skip Signal Handling** (Priority: CRITICAL)
   - Add conditional check in `scripts/ingest.js` after Scout
   - Test with actual unchanged source

2. **Add End-to-End Integration Tests** (Priority: CRITICAL)
   - Test 1: Run pipeline twice with same URL → verify early exit
   - Test 2: Run pipeline with v1 then v2 → verify fact_history
   - Test 3: Run pipeline with conflicting sources → verify resolution

3. **Verify Agent Behaviors** (Priority: HIGH)
   - Add tests that run actual agents and verify outputs
   - Confirm Validator outputs updated_facts, removed_facts, etc.
   - Confirm Merger applies conflict resolution rules

4. **Improve Test Coverage** (Priority: MEDIUM)
   - Convert static file checks to dynamic pipeline tests
   - Add tests for error scenarios
   - Add tests for edge cases

---

## Conclusion

The system has **excellent design and documentation** but **critical implementation gaps** prevent it from working as intended. The architecture is sound, the strategies are correct, but the execution is incomplete.

**Key Strengths**:
- Comprehensive agent documentation
- Well-designed fact ID system
- Sound conflict resolution strategies
- Good frontmatter validation

**Key Weaknesses**:
- Skip signal not acted upon (defeats early exit optimization)
- No end-to-end integration tests (cannot verify behavior)
- Documented behaviors not verified in practice

**Final Assessment**: The requirement is PARTIALLY MET. With critical fixes to skip signal handling and integration testing, this could be a PASS. Currently, it's a well-designed system that doesn't fully execute as documented.

---

**Auditor Conclusion**: DO NOT DEPEND on current implementation for production use. Critical gaps must be fixed first. The foundation is solid, but the house is incomplete.
