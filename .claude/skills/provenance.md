# Provenance & Citation Skill

**Purpose**: Define citation format and confidence assignment rules

**Used by**: Extractor, Validator, Merger

## Source Types

### Official (amazon.com/docs)
- Technical documentation
- API references
- Official guides
**Confidence**: High (by default)

### Official Marketing (advertising.amazon.com/solutions)
- Product pages
- Feature descriptions
- Marketing materials
**Confidence**: High (by default)

### Unofficial
- Third-party blogs
- Community forums
- External resources
**Confidence**: Medium or Low (varies based on clarity)

## Confidence Level Assignment

### High Confidence
- All official documentation (amazon.com/docs)
- Official marketing pages (advertising.amazon.com)
- Explicit, clear statements with direct attribution
- Current, non-outdated content

### Medium Confidence
- Unofficial but reputable sources
- Implicit facts (inferred but not explicitly stated)
- Statements with some ambiguity
- Content that might be slightly outdated

### Low Confidence
- Unofficial sources with unclear provenance
- Outdated or deprecated content
- Unclear or ambiguous statements
- Facts that contradict other sources

## Citation Format

### Per-Fact Citation
Every fact MUST include:
- `source_url`: Direct URL to source
- `source_excerpt`: Relevant text excerpt from source

### Example
```json
{
  "statement": "Sponsored Products appear in shopping results",
  "confidence": "high",
  "source_url": "https://advertising.amazon.com/solutions/products/sponsored-products",
  "source_excerpt": "Sponsored Products ads appear in shopping results pages...",
  "content_type": "product-page",
  "extraction_timestamp": "2026-08-10T12:00:00Z"
}
```

## Multi-Source Attribution

When a concept cites multiple sources:

### Frontmatter Format
```yaml
sources:
  - https://advertising.amazon.com/...
  - https://advertising.amazon.com/API/docs/...
```

### Body Format
```markdown
## Facts
1. Fact statement here
   - Source: https://advertising.amazon.com/... (excerpt)
2. Another fact
   - Source: https://advertising.amazon.com/API/docs/... (excerpt)
```

## Provenance Tracking

### Extractor Responsibilities
- Attach `source_url` and `source_excerpt` to EVERY fact
- Assign initial confidence based on source type
- Track extraction timestamp

### Validator Responsibilities
- Verify source URL is accessible and relevant
- Adjust confidence if source is outdated or unofficial
- Flag facts with missing or invalid citations

### Merger Responsibilities
- Preserve all source URLs when merging concepts
- Update `sources_count` in frontmatter
- Keep highest confidence per fact when duplicates exist
