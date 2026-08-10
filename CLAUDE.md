# Amazon Ads Knowledge Base - Project Documentation

## Overview

This is an autonomous knowledge acquisition system for Amazon Ads. It discovers content from URLs, extracts facts, validates against existing knowledge, merges duplicates, and publishes everything as OKF v0.1 documents.

## Architecture

The system uses a pipeline of 5 specialized agents:

1. **Scout** - Fetches content and detects changes via SHA-256 hashing
2. **Extractor** - Pulls facts with source attribution and confidence levels
3. **Validator** - Checks new facts against existing knowledge
4. **Merger** - Combines related concepts and resolves conflicts
5. **Publisher** - Writes OKF files and updates indices

Plus 3 shared skills:
- **okf-formatter** - OKF v0.1 frontmatter structure rules
- **dedup-merge** - Concept deduplication and merge logic
- **provenance** - Citation format and confidence assignment

And 1 safety hook:
- **validate-okf-frontmatter** - Blocks writes if required fields missing

## Repository Structure

```
amazon-ads-kb/
├── knowledge/                    # Published OKF documents
│   ├── .manifest.json           # Source → hash → last_checked tracking
│   ├── index.md                 # Catalog of all concepts
│   ├── log.md                   # Ingestion history
│   ├── concepts/                # Individual concept documents
│   └── sources/                 # Raw fetched content
├── .claude/
│   ├── skills/                  # Shared rules for agents
│   ├── agents/                  # Agent instruction files
│   └── hooks/                   # Validation hooks
├── scripts/
│   └── ingest.js                # CLI entry point (placeholder)
├── CLAUDE.md                    # This file
├── README.md                    # User-facing documentation
└── NOTES.md                     # Design decisions log
```

## Using This Repo with Claude Code

### Running the Pipeline

To ingest a URL:

```
claude -p "ingest <url>, update the bundle"
```

Example:
```
claude -p "ingest https://advertising.amazon.com/solutions/products/sponsored-products, update the bundle"
```

### Working with Agents

Claude Code will automatically load agents when needed. You can also invoke them directly:

```
claude -p "Use the Scout agent to fetch https://... and detect changes"
```

### Accessing Skills

Skills are automatically available to all agents. They provide shared rules for:
- OKF formatting (`.claude/skills/okf-formatter.md`)
- Deduplication (`.claude/skills/dedup-merge.md`)
- Provenance tracking (`.claude/skills/provenance.md`)

## Design Principles

### Safe Re-runs
The system is idempotent — running it twice on the same source produces zero changes the second time. This is achieved via:
- SHA-256 content hashing
- `.manifest.json` tracking
- Deterministic change detection

### Fact Provenance
Every fact traces back to a source with:
- Source URL
- Source excerpt
- Confidence level (high/medium/low)
- Extraction timestamp

### Conflict Resolution
When sources contradict:
- Official sources (amazon.com/docs) win over unofficial
- Higher confidence wins when equal officialness
- Two official sources contradicting → flag for manual review

### Hierarchical Tags
Tags use hierarchical paths for better organization:
- `products/sponsored-products/bidding`
- `products/sponsored-brands/creative-assets`
- `guides/best-practices/campaign-setup`

## Test Sources

The system is designed for three test URLs:

1. **Product/Marketing Page**: https://advertising.amazon.com/solutions/products/sponsored-products
2. **How-to Guide**: https://advertising.amazon.com/library/guides/sponsored-products-best-practices
3. **Technical Docs**: https://advertising.amazon.com/API/docs/en-us/guides/sponsored-brands/overview

## OKF v0.1 Format

Every concept document follows OKF v0.1 spec with project extensions:

```yaml
---
type: concept
title: Sponsored Products Bidding Basics
description: Core bidding mechanics for Amazon Sponsored Products
resource: https://advertising.amazon.com/...
tags:
  - products/sponsored-products/bidding
confidence: high
sources_count: 2
official_source: true
last_checked: 2026-08-10T12:00:00Z
timestamp: 2026-08-10T12:00:00Z
---
```

Required fields:
- OKF spec: `type`, `title`, `description`, `resource`, `tags`, `timestamp`
- Project extensions: `confidence`, `sources_count`, `official_source`, `last_checked`

## Verification

To verify the system works:

1. Ingest a URL
2. Check `knowledge/concepts/` for generated `.okf.md` files
3. Check `knowledge/index.md` for updated catalog
4. Check `knowledge/.manifest.json` for source tracking
5. Re-run the same URL → verify zero changes (git diff shows nothing)

## Troubleshooting

### Hook Blocks Write
If `validate-okf-frontmatter` blocks a write, check that all required fields are present in frontmatter.

### Manifest Corruption
If `.manifest.json` gets corrupted, delete it and re-run ingestion (will treat all sources as new).

### Missing Concepts
If concepts aren't generated, check the agent logs in the Claude Code conversation.

## Development Status

- ✅ Repository structure scaffolded
- ✅ Skills defined
- ✅ Agents defined
- ✅ Hook implemented
- ⏳ Testing with real URLs
- ⏳ Documentation completion
