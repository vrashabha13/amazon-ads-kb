# OKF Formatter Skill

**Purpose**: Define OKF v0.1 frontmatter structure and formatting rules

**Used by**: Extractor, Publisher, Merger

## Required Fields (OKF v0.1 Spec)

Every OKF document MUST include these frontmatter fields:

- `type`: Document type (e.g., "concept", "guide", "reference")
- `title`: Human-readable title
- `description`: One-line summary
- `resource`: Primary source URL
- `tags`: Array of hierarchical tags (e.g., `["products/sponsored-products/bidding"]`)
- `timestamp`: ISO 8601 timestamp (YYYY-MM-DDTHH:mm:ssZ)

## Project Extensions (Required for this project)

- `confidence`: One of "high", "medium", "low"
- `sources_count`: Number of distinct sources cited
- `official_source`: Boolean - true if source is amazon.com/docs
- `last_checked`: ISO 8601 timestamp when content was last verified

## Optional Fields (for source change tracking)

These fields are added by Merger when sources change:

- `deprecated_facts`: Array of removed facts with metadata (when facts are removed due to source changes)
- `fact_history`: Object tracking fact updates and supersedence (when facts are updated due to source changes)
- `merge_notes`: Array of conflict resolutions and merge decisions

**Format for deprecated_facts:**
```yaml
deprecated_facts:
  - fact_id: "fact-abc123-xyz789"
    statement: "Maximum 10 products per ad"
    removed_at: "2026-08-11T00:00:00Z"
    reason: "Source updated, value changed to 50"
```

**Format for fact_history:**
```yaml
fact_history:
  fact-new50-new51:
    current_statement: "Maximum 50 products per ad"
    current_fact_id: "fact-abc12350-xyz78950"
    supersedes: "fact-abc12310-xyz78910"
    previous_statement: "Maximum 10 products per ad"
    previous_fact_id: "fact-abc12310-xyz78910"
    updated_at: "2026-08-11T00:00:00Z"
    reason: "Source updated, value changed from 10 to 50"
```

**Key fields:**
- `current_fact_id`: Fact ID of the new (current) version
- `previous_fact_id`: Fact ID of the old (superseded) version
- `supersedes`: Maps new fact ID to old fact ID
- `reason`: Explanation of why the change occurred

## Tag Naming Conventions

- Use hierarchical tags with `/` separator
- Format: `category/subcategory/specific`
- Examples:
  - `products/sponsored-products/bidding`
  - `products/sponsored-brands/creative-assets`
  - `guides/best-practices/campaign-setup`

## Markdown Body Structure

1. **Overview**: Brief description of the concept
2. **Facts**: Numbered list of factual statements
3. **Sources**: Citation list for each fact
4. **Notes**: Any conflicts, ambiguities, or manual review flags

## Example

### Simple Example (no changes)

```yaml
---
type: concept
title: Sponsored Products Bidding Basics
description: Core bidding mechanics for Amazon Sponsored Products
resource: https://advertising.amazon.com/library/guides/sponsored-products-bidding
tags:
  - products/sponsored-products/bidding
  - products/sponsored-products/basics
confidence: high
sources_count: 2
official_source: true
last_checked: 2026-08-10T12:00:00Z
timestamp: 2026-08-10T12:00:00Z
---

# Sponsored Products Bidding Basics

## Overview
Sponsored Products use keyword-based and product-targeted bidding strategies.

## Facts
1. **Default Bidding Strategy** [fact-e179dba1-5a6c3b8a]: Default bidding strategy is "dynamic bids - down only"
2. **Manual Bid Override** [fact-e179dba2-7b8d4c9b]: Manual bids override automatic bidding when set
3. **Bid Management Level** [fact-e179dba3-9e0f5d1c]: Bids are managed at the ad group or keyword level

## Sources
- Facts 1-2: https://advertising.amazon.com/library/guides/sponsored-products-bidding
- Fact 3: https://advertising.amazon.com/API/docs/en-us/keywords/bidding
```

### Example with Source Changes

```yaml
---
type: concept
title: Sponsored Products Limits
description: Current limits and quotas for Amazon Sponsored Products
resource: https://advertising.amazon.com/solutions/products/sponsored-products
tags:
  - products/sponsored-products/limits
confidence: high
sources_count: 1
official_source: true
last_checked: 2026-08-11T00:00:00Z
timestamp: 2026-08-11T00:00:00Z
deprecated_facts:
  - fact_id: "fact-abc123-xyz789"
    statement: "Maximum 10 products per ad"
    removed_at: "2026-08-11T00:00:00Z"
    reason: "Source updated, value changed to 50"
fact_history:
  fact-new50-new51:
    current_statement: "Maximum 50 products per ad"
    supersedes: "fact-abc123-xyz789"
    previous_statement: "Maximum 10 products per ad"
    updated_at: "2026-08-11T00:00:00Z"
merge_notes:
  - "Source updated: Maximum products per ad changed from 10 to 50"
---

# Sponsored Products Limits

## Overview
Current limits and quotas for Amazon Sponsored Products campaigns.

## Facts
1. **Maximum Products per Ad** [fact-abc12350-xyz78950]: Maximum 50 products per ad
2. **Maximum Campaigns** [fact-def45678-uvw01234]: Maximum 10 campaigns per account

## Sources
- Fact 1: https://advertising.amazon.com/solutions/products/sponsored-products (updated)
- Fact 2: https://advertising.amazon.com/solutions/products/sponsored-products

## Notes
- On 2026-08-11, the source documentation was updated to increase the maximum products per ad from 10 to 50
- Historical data preserved in fact_history frontmatter field
```

## Canonical Required Fields Definition

This is the single source of truth for required OKF frontmatter fields. All validation logic and documentation should reference this definition.

**JavaScript representation:**
```javascript
// Canonical required fields from OKF v0.1 spec + project extensions
const REQUIRED_FIELDS = [
  // OKF v0.1 Core Fields (6)
  'type',
  'title',
  'description',
  'resource',
  'tags',
  'timestamp',

  // Project Extensions (4)
  'confidence',
  'sources_count',
  'official_source',
  'last_checked'
];
```

**Total: 10 required fields**

This list is used by:
- `.claude/hooks/validate-okf-frontmatter.js` - Validation hook
- `.claude/skills/okf-formatter.md` - Agent instructions (this file)
- `.claude/agents/publisher.md` - Publishing agent
- `.claude/agents/extractor.md` - Extraction agent

Any changes to required fields must be updated in all locations to maintain consistency.
