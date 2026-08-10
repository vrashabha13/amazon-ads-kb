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

### Step 5: Write Merged Document
- Follow OKF formatter skill
- Preserve both source URLs in `sources` array
- Add merge note to body if conflicts exist

## Example Merge

**Before:**
- Concept A: "SP Bidding" (3 facts, confidence: high)
- Concept B: "Bidding Strategies" (2 facts, confidence: medium)

**After:**
- Concept: "Sponsored Products Bidding Strategies" (5 facts, confidence: high)
- Sources: both A and B URLs
- Tags: union of both tag sets
