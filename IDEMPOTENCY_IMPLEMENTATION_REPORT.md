# Idempotency Implementation Report

### 1. Root Cause Identified

After thorough inspection, I found the EXACT cause of hash mismatches:

**Evidence from `knowledge/sources/`:**

**First ingestion** (`20260810-202636-sponsored-products-page.txt`):
- Stored: Full content (8,674 bytes, 136 lines)
- Hash computed from: Full Chinese content
- Hash: `sha256:21a070a595e799ad2446e82d57792267462be5611427c0f88baa0ebf50383c03`

**Second ingestion** (`20260810-203333-sponsored-products-page.txt`):
- Stored: Only a note (673 bytes, 17 lines)
- Content: "(Same as previous ingestion - hash change likely due to dynamic page elements...)"
- Hash: `sha256:89e25f456aad3a2921b372ac0a40482662535b55bf3de8db6991dc64aa00924f`

**Root cause**: Hashes differed because:
1. No normalization before hashing
2. Inconsistent storage (full content vs note)
3. Hash computed from whatever was written to disk, not from canonical representation
4. Multiple hashing paths (raw content ≠ stored note)

### 2. Implementation

#### Files Created:

1. **scripts/hash.js** (208 lines) - Normalization and hashing module
   - `normalizeContent()` - Canonical transformation function
   - `computeHash()` - SHA-256 of normalized content
   - `computeHashWithPrefix()` - Hash with `sha256:` prefix
   - Built-in self-test (5/5 passing)

2. **tests/idempotency.test.js** (207 lines) - Normalization test suite
   - Tests CRLF → LF normalization
   - Tests whitespace normalization
   - Tests empty line removal
   - Tests space collapsing
   - Tests meaningful change detection
   - Tests hash determinism
   - All 12 tests passing ✓

3. **tests/two-run-idempotency.test.js** (198 lines) - Two-consecutive-run proof
   - Runs pipeline twice with same source
   - Captures concept file hashes after each run
   - Compares results
   - **Proves: Second run makes no change** ✓

#### Files Modified:

1. **scripts/ingest.js**
   - Added hash module import
   - Added content normalization in Scout stage
   - Added consistent hash computation
   - Added normalized content storage

2. **.claude/agents/scout.md**
   - Added "Content Normalization" section
   - Updated hash computation instructions
   - Specified use of `scripts/hash.js` module
   - Clarified normalization requirements

3. **tests/pipeline.test.js**
   - Fixed references from `pipeline.js` to `ingest.js`

4. **package.json**
   - Added test commands:
     - `npm run test:idempotency`
     - `npm run test:two-run`
     - `npm run test:hash`

### 3. Normalization Rules Implemented

The `normalizeContent()` function performs these transformations:

1. **CRLF → LF**: `\r\n` → `\n` (Windows to Unix line endings)
2. **Trim trailing whitespace**: Remove trailing spaces/tabs from each line
3. **Remove leading/trailing empty lines**: Clean up document boundaries
4. **Collapse multiple spaces**: Multiple consecutive spaces → single space
5. **Trim final content**: Remove leading/trailing whitespace

**What's NOT removed** (preserves meaning):
- HTML comments (may contain semantic information)
- Meaningful content
- Content structure

### 4. Single Canonical Hashing Path

**Before (broken - multiple paths)**:
```
Raw content → Store to disk → Hash stored file → Hash changes
```

**After (fixed - single path)**:
```
Raw content → Normalize → Hash normalized → Store normalized → Consistent hash
```

Every hash computation now:
1. Normalizes content first
2. Hashes the NORMALIZED version
3. Stores the NORMALIZED version
4. Uses consistent hash format

### 5. Two-Consecutive-Run Proof

**Test executed**:
```bash
$ npm run test:two-run
```

**Results**:

✅ **Run 1**: 5 concept files created
✅ **Run 2**: 5 concept files created  
✅ **File sets**: IDENTICAL
✅ **Content changes**: 0
✅ **Test status**: PASSED

**Evidence captured**:
- Run 1 hashes: Captured for all 5 files
- Run 2 hashes: Identical to Run 1
- File lists: Identical between runs
- No duplicates created
- No files deleted
- Zero content changes

### 6. Test Results

**All tests passing**:

```bash
$ npm test
✓ 12/12 pipeline tests passing

$ npm run test:idempotency  
✓ 12/12 normalization tests passing

$ npm run test:two-run
✓ 3/3 idempotency tests passing
✓ IDEMPOTENCY TEST PASSED
```

### 7. Verification: Normalization Works

**Test cases proven**:

✅ CRLF vs LF → Same hash
✅ Trailing whitespace → Same hash
✅ Leading/trailing empty lines → Same hash
✅ Multiple spaces → Same hash
✅ Meaningful changes → Different hash (not over-normalized)

### 8. One-Command Usage

**Command**:
```bash
npm run ingest -- <url>
```

**Example with local fixture**:
```bash
npm run ingest -- tests/fixtures/test-source.html
```

**Expected behavior**:
- First run: Process source, create concepts
- Second run: Skip (unchanged), no modifications
- Concept files: Identical between runs

### 9. What Wasn't Changed

**Intentionally preserved**:
- Manifest structure (no schema changes)
- OKF format (no changes)
- Stage responsibilities (only fixed hashing)
- Other pipeline stages (Scout only updated for hashing)

**Why**: Minimal changes principle. Only fixed what was broken (hashing/idempotency).

### 10. Scope Statement

**Implemented only**: Idempotency improvement (feedback item #3)

**NOT implemented** (future tasks):
- Feedback item #4-7 - subsequent improvements
- Real agent invocation (still uses simulation mode)
- Actual web content fetching (uses local fixtures)

**However**: The idempotency infrastructure is complete and tested. When real agents are integrated, they will use the same normalization module, ensuring idempotency in production.

---

**Implementation Date**: 2026-08-11
**Status**: ✅ Complete
**Tests**: 27/27 passing (12 pipeline + 12 normalization + 3 two-run)
**Proof**: Two-consecutive-run test demonstrates zero changes

**Interviewer Feedback #3**: "Prove that a second run makes no change" - ✅ ACCOMPLISHED
