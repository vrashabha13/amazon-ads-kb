# Ingestion Log

This log tracks all ingestion operations performed on the Amazon Ads knowledge base.

## Recent Activity

### 2026-08-10T20:33:33Z (RE-INGESTION)

**Re-checked**: https://advertising.amazon.com/solutions/products/sponsored-products

**Details**:
- Previous hash: `sha256:21a070a595e799ad2446e82d57792267462be5611427c0f88baa0ebf50383c03`
- Current hash: `sha256:89e25f456aad3a2921b372ac0a40482662535b55bf3de8db6991dc64aa00924f`
- Content type: product-page
- Language: zh-CN (Chinese)
- Status: CHANGED (hash mismatch)
- Facts re-extracted: 27
- Concepts created: 0 (already exist)
- Validation: All duplicates (semantically identical content)

**Pipeline Behavior**:
- ✅ Scout: Content fetched, hash changed detected
- ✅ Extractor: Facts re-extracted
- ✅ Validator: Detected 27 duplicate facts (existing concepts)
- ⏭️ Merger: Skipped (concepts already exist)
- ✅ Publisher: Updated manifest only (no concept file changes)

**Important Notes**:
- Content hash changed due to dynamic page elements or webReader formatting differences
- Semantic content is identical - no actual changes to facts
- No concept files were modified (idempotent at semantic level)
- Manifest updated with new hash and last_checked timestamp
- System correctly handles hash changes while avoiding unnecessary re-creation

**Source Metadata**:
- Official source: true (advertising.amazon.com)
- Confidence level: high
- Hierarchical tags: products/sponsored-products/*

---

### 2026-08-10T20:26:36Z (FIRST INGESTION)

**Ingested**: https://advertising.amazon.com/solutions/products/sponsored-products

**Details**:
- Content hash: `sha256:21a070a595e799ad2446e82d57792267462be5611427c0f88baa0ebf50383c03`
- Content type: product-page
- Language: zh-CN (Chinese)
- Status: NEW (first ingestion)
- Facts extracted: 27
- Concepts created: 5
- Validation: Passed (0 conflicts, 0 duplicates)

**Concepts Generated**:
1. `sponsored-products-basics.okf.md` (10 facts)
2. `sponsored-products-ad-placement.okf.md` (4 facts)
3. `sponsored-products-targeting-bidding.okf.md` (6 facts)
4. `sponsored-products-budget-costs.okf.md` (8 facts)
5. `sponsored-products-eligibility.okf.md` (5 facts)

**Pipeline Stages**:
- ✅ Scout: Content fetched and hashed
- ✅ Extractor: Facts extracted with source attribution
- ✅ Validator: Validated against existing knowledge (no conflicts)
- ✅ Merger: Concepts merged and created
- ✅ Publisher: Files written and indices updated

**Source Metadata**:
- Official source: true (advertising.amazon.com)
- Confidence level: high
- Hierarchical tags applied: products/sponsored-products/*

## Statistics

- Total Ingestions: 2
- Successful: 2
- Failed: 0
- Skipped (unchanged): 0
- Re-ingested (hash changed): 1

---

*This log is automatically maintained by the Publisher agent.*
