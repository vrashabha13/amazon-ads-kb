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
