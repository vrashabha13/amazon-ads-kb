# Amazon Ads Knowledge Base

An autonomous knowledge acquisition system for Amazon Ads content. Discovers facts from URLs, validates against existing knowledge, merges duplicates, and publishes as OKF v0.1 documents.

## 🚀 Quick Start

### Prerequisites

- **Claude Code** CLI installed
- Node.js (for utility scripts)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/amazon-ads-kb.git
cd amazon-ads-kb

# The repository is ready to use!
# Claude Code automatically loads .claude/ configuration
```

### 🔒 Security Setup

**IMPORTANT**: This repository uses Claude Code which requires API credentials. Never commit API keys!

```bash
# Copy the example settings file
cp .claude/settings.example.json .claude/settings.json

# Edit and add your own API credentials
# IMPORTANT: .claude/settings.json is in .gitignore and will NOT be committed
nano .claude/settings.json
```

**What gets committed**:
- ✅ `.claude/settings.example.json` (template, no credentials)
- ❌ `.claude/settings.json` (your credentials, excluded by .gitignore)

### Usage

#### Ingest a URL

```bash
# Using Claude Code CLI
claude -p "ingest <url>, update the bundle"

# Example:
claude -p "ingest https://advertising.amazon.com/solutions/products/sponsored-products, update the bundle"
```

#### Run the ingest script (alternative)

```bash
node scripts/ingest.js <url>

# Example:
node scripts/ingest.js https://advertising.amazon.com/solutions/products/sponsored-products
```

## 📁 Repository Structure

```
amazon-ads-kb/
├── knowledge/                    # Published OKF documents
│   ├── .manifest.json          # Source tracking with hashes
│   ├── index.md                # Catalog of all concepts
│   ├── log.md                  # Ingestion history
│   ├── concepts/               # OKF concept documents
│   │   ├── sponsored-products-basics.okf.md
│   │   ├── sponsored-products-ad-placement.okf.md
│   │   └── ...
│   └── sources/                # Raw fetched content
├── .claude/
│   ├── agents/                 # Agent instructions (Scout, Extractor, etc.)
│   ├── skills/                 # Shared rules (OKF format, dedup, provenance)
│   └── hooks/                 # Validation hooks
├── scripts/
│   └── ingest.js              # CLI entry point
├── CLAUDE.md                   # Project documentation for Claude
├── README.md                   # This file
└── NOTES.md                    # Design decisions & tradeoffs
```

## 🏗️ Architecture

### Pipeline Stages

The system uses a 5-stage pipeline:

1. **Scout** - Fetches content and detects changes via SHA-256 hashing
2. **Extractor** - Pulls facts with source attribution and confidence levels
3. **Validator** - Checks new facts against existing knowledge
4. **Merger** - Combines related concepts and resolves conflicts
5. **Publisher** - Writes OKF files and updates indices

### Skills (Shared Rules)

- **okf-formatter** - OKF v0.1 frontmatter structure
- **dedup-merge** - Concept deduplication and merge logic
- **provenance** - Citation format and confidence assignment

### Safety Features

- **Re-run safe**: Ingesting the same URL twice produces zero changes (semantic idempotency)
- **Hash-based change detection**: SHA-256 content hashing
- **Frontmatter validation**: Hook blocks invalid OKF writes
- **Conflict resolution**: Official sources win, manual review for contradictions

## 📊 OKF v0.1 Format

Every concept document follows the OKF v0.1 specification:

```yaml
---
type: concept
title: Sponsored Products Basics
description: Overview of Amazon Sponsored Products advertising
resource: https://advertising.amazon.com/...
tags:
  - products/sponsored-products/basics
confidence: high
sources_count: 1
official_source: true
last_checked: 2026-08-10T20:26:36Z
timestamp: 2026-08-10T20:26:36Z
---

# Sponsored Products Basics

## Overview
...

## Facts
1. Fact statement
2. Another fact

## Sources
- Facts 1-2: URL (excerpt)

## Notes
Additional context...
```

### Required Fields

**OKF v0.1 Spec**:
- `type`, `title`, `description`, `resource`, `tags`, `timestamp`

**Project Extensions**:
- `confidence` (high/medium/low)
- `sources_count`
- `official_source` (boolean)
- `last_checked`

## 🔄 Verification

### Check Ingestion Results

```bash
# View generated concepts
ls knowledge/concepts/

# Check catalog
cat knowledge/index.md

# View ingestion log
cat knowledge/log.md

# Verify manifest
cat knowledge/.manifest.json
```

### Test Re-run Safety

```bash
# Ingest the same URL twice
claude -p "ingest <url>, update the bundle"
claude -p "ingest <url>, update the bundle"

# Second run should produce zero changes to concept files
git diff knowledge/concepts/  # Should be empty
```

## 🌐 Supported Content Types

The system handles diverse Amazon Ads content:

- **Product/Marketing Pages** (advertising.amazon.com/solutions/products/*)
- **How-to Guides** (advertising.amazon.com/library/guides/*)
- **Technical Documentation** (advertising.amazon.com/API/docs/*)

## 📈 Statistics

Track progress via `knowledge/index.md`:

- Total concepts ingested
- Total sources processed
- Last updated timestamp
- Tag index for navigation

## 🛠️ Development

### Running Tests

```bash
# Test individual agents (via Claude Code)
claude -p "Use the Scout agent to fetch and hash <url>"
claude -p "Use the Extractor agent to extract facts from content"
claude -p "Use the Validator agent to check for conflicts"

# Full pipeline test
claude -p "ingest <url>, run full pipeline and verify"
```

### Adding New Skills

Create `.md` files in `.claude/skills/`:
1. Define clear rules and guidelines
2. Specify which agents use the skill
3. Include examples and edge cases

### Adding New Agents

Create `.md` files in `.claude/agents/`:
1. Define agent role and responsibilities
2. Specify tools the agent will use
3. Distinguish deterministic vs judgment operations
4. Provide clear output format

## 🔧 Troubleshooting

### Hook Blocks Write

**Error**: Missing required frontmatter fields

**Solution**: Ensure all OKF documents have required fields:
- `type`, `title`, `description`, `resource`, `tags`, `timestamp`
- `confidence`, `sources_count`, `official_source`, `last_checked`

### Manifest Corruption

**Error**: Invalid `.manifest.json` format

**Solution**: Delete the file and re-run ingestion:
```bash
rm knowledge/.manifest.json
claude -p "ingest <url>, update the bundle"
```

### Missing Concepts

**Error**: Ingestion completes but no concepts generated

**Solution**: Check Claude Code conversation for agent logs and errors

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with multiple URLs
5. Submit a pull request

## 📧 Contact

For questions or issues, please open a GitHub issue.

---

**Built with Claude Code** | OKF v0.1 Compliant | Re-run Safe ⚡
