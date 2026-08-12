# Ingestion Log

This log tracks all ingestion operations performed on the Amazon Ads knowledge base.

## Recent Activity

### 2026-08-12T14:00:00Z (KNOWLEDGE EXPANSION)

**Batch Ingestion**: Multiple sources added to expand knowledge base

**Sources Ingested** (4 new sources):
- https://advertising.amazon.com/solutions/products/sponsored-brands
- https://advertising.amazon.com/solutions/products/sponsored-display
- https://advertising.amazon.com/library/guides/sponsored-products-best-practices
- https://advertising.amazon.com/library/guides/campaign-optimization

**Details**:
- New concepts created: 9
- Multi-source concepts created: 4
- Product areas expanded: 1 → 3 (Sponsored Products, Sponsored Brands, Sponsored Display)
- Cross-links added: 15+
- Total concepts: 5 → 14
- Total sources: 1 → 5

**New Concepts Generated**:
1. `sponsored-brands-basics.okf.md` (from Sponsored Brands source)
2. `sponsored-brands-creative-assets.okf.md` (from Sponsored Brands source)
3. `sponsored-brands-campaign-structure.okf.md` (from Sponsored Brands source)
4. `sponsored-display-basics.okf.md` (from Sponsored Display source)
5. `sponsored-display-audience-targeting.okf.md` (from Sponsored Display source)
6. `sponsored-products-optimization.okf.md` (multi-source: SP + Best Practices)
7. `sponsored-products-measurement.okf.md` (multi-source: SP + Best Practices)
8. `bidding-strategies.okf.md` (multi-source: SP + Brands + Display + Optimization)
9. `budget-management.okf.md` (multi-source: SP + Brands + Display + Optimization)

**Pipeline Stages**:
- ✅ Scout: Content fetched for all 4 new sources
- ✅ Extractor: Facts extracted with source attribution
- ✅ Validator: Validated against existing knowledge, identified overlaps
- ✅ Merger: Multi-source concepts merged with provenance preservation
- ✅ Publisher: Files written, indices updated, manifest expanded

**Multi-Source Merge Evidence**:

**Merge Case 1**: Bidding Strategies (4 sources)
- Sources: Sponsored Products, Sponsored Brands, Sponsored Display, Campaign Optimization Guide
- Overlapping facts: CPC pricing model, dynamic bidding strategies, bid management
- Result: Combined concept with sources_count: 4
- Product-specific distinctions preserved while highlighting common principles

**Merge Case 2**: Budget Management (3 sources)
- Sources: Sponsored Products, Sponsored Brands, Sponsored Display, Campaign Optimization Guide
- Overlapping facts: Daily budget controls, spend pacing, performance monitoring
- Result: Combined concept with sources_count: 3
- Product-specific differences noted (e.g., Sponsored Brands lifetime budgets)

**Merge Case 3**: Sponsored Products Optimization (2 sources)
- Sources: Sponsored Products, Best Practices Guide
- Overlapping facts: Performance optimization, keyword research, bid management
- Result: Enhanced concept with sources_count: 2
- Best practices guide added tactical depth to foundational concepts

**Merge Case 4**: Sponsored Products Measurement (2 sources)
- Sources: Sponsored Products, Best Practices Guide
- Overlapping facts: Core metrics, ACoS/ROAS calculations, performance analysis
- Result: Enhanced concept with sources_count: 2
- Measurement best practices enhanced basic metric coverage

**Cross-Linking Strategy**:
- Product-specific concepts link to related concepts within same product area
- Cross-product concepts link to all relevant product-specific concepts
- Total cross-links: 15+
- All links verified: 0 broken links

**Source Metadata**:
- All sources: official_source: true (advertising.amazon.com)
- Confidence levels: uniform high confidence
- Hierarchical tags applied consistently across product areas
- Multi-source concepts preserve provenance with source citations

**Quality Improvements**:
- Knowledge breadth: 1 → 3 product areas
- Knowledge depth: 5 → 14 concepts
- Multi-source demonstration: 0 → 4 concepts
- Cross-document relationships: 0 → 15+ links
- Provenance preservation: Complete for all concepts

---

## Previous Activity

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

- Total Ingestions: 3
- Successful: 3
- Failed: 0
- Skipped (unchanged): 0
- Re-ingested (hash changed): 1
- Batch ingestions: 1

---

*This log is automatically maintained by the Publisher agent.*
