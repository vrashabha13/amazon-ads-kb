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
    supersedes: "fact-abc123-xyz789"
    previous_statement: "Maximum 10 products per ad"
    updated_at: "2026-08-11T00:00:00Z"
```

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
1. Default bidding strategy is "dynamic bids - down only"
2. Manual bids override automatic bidding when set
3. Bids are managed at the ad group or keyword level

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
1. Maximum 50 products per ad (updated from 10 on 2026-08-11)
2. Maximum 10 campaigns per account

## Sources
- Fact 1: https://advertising.amazon.com/solutions/products/sponsored-products (updated)
- Fact 2: https://advertising.amazon.com/solutions/products/sponsored-products

## Notes
- On 2026-08-11, the source documentation was updated to increase the maximum products per ad from 10 to 50
- Historical data preserved in fact_history frontmatter field
```
