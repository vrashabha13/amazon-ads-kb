# Design Notes & Tradeoffs

This document captures the design decisions, tradeoffs, and lessons learned during the development of the Amazon Ads Knowledge Base system.

## Table of Contents

1. [Architecture Decisions](#architecture-decisions)
2. [Technology Choices](#technology-choices)
3. [Design Tradeoffs](#design-tradeoffs)
4. [Lessons Learned](#lessons-learned)
5. [Future Improvements](#future-improvements)

---

## Architecture Decisions

### Why 5 Separate Agents?

**Decision**: Use specialized agents (Scout, Extractor, Validator, Merger, Publisher) rather than a single monolithic agent.

**Rationale**:
- **Single Responsibility**: Each agent has one clear job
- **Testability**: Can test each stage independently
- **Reusability**: Skills can be shared across agents
- **Maintainability**: Easier to fix bugs in isolated stages

**Tradeoff**: More complex orchestration and handoff between stages.

**Alternative Considered**: Single agent that does everything. Rejected because it would be harder to test, debug, and maintain.

### Why Natural Language Agents (Not Code)?

**Decision**: Use `.md` files with natural language instructions for agents/skills, not Python/JavaScript code.

**Rationale**:
- **Flexibility**: Claude's natural language understanding handles edge cases better than rigid code
- **Maintainability**: Easier to update rules by editing text than rewriting code
- **Claude Code Native**: This is how Claude Code is designed to work
- **Rapid Prototyping**: Can iterate quickly without compilation

**Tradeoff**: Less precise control than code, dependent on Claude's understanding.

**Alternative Considered**: Python-based ETL pipeline. Rejected because it would be more brittle and harder to adapt to content changes.

### Why SHA-256 Hashing for Change Detection?

**Decision**: Use SHA-256 hashes of content instead of timestamps or ETags.

**Rationale**:
- **Reliability**: Servers lie about timestamps, caching breaks ETags
- **Deterministic**: Same content always produces same hash
- **Efficiency**: Can skip expensive extraction/validation if hash matches
- **Ground Truth**: Hash represents actual content, not metadata

**Tradeoff**: Dynamic content (timestamps, counters) causes hash changes even when semantic content is unchanged.

**Mitigation**: Validator detects duplicates at semantic level, avoiding unnecessary re-creation.

**Alternative Considered**: HTTP ETags or Last-Modified headers. Rejected because they're unreliable and server-dependent.

### Why Hierarchical Tags?

**Decision**: Use hierarchical tag paths like `products/sponsored-products/bidding` instead of flat tags.

**Rationale**:
- **Organization**: Better structure for large knowledge bases
- **Navigation**: Easier to browse related concepts
- **Scalability**: Can grow without tag conflicts
- **Clarity**: Shows relationships between concepts

**Tradeoff**: More complex than flat tags, requires consistent naming conventions.

**Alternative Considered**: Flat tags (e.g., `sp-bidding`). Rejected because it wouldn't scale well.

---

## Technology Choices

### Why Claude Code Over Custom ETL?

**Decision**: Build on Claude Code instead of custom Python/TypeScript ETL pipeline.

**Rationale**:
- **AI-Native**: Leverages Claude's understanding for extraction and validation
- **Less Code**: Rules in natural language vs hundreds of lines of code
- **Adaptable**: Handles content variations without code changes
- **Maintainable**: Business logic visible in `.md` files

**Tradeoff**: Dependent on Claude Code availability and pricing.

**Alternative Considered**: Custom Python pipeline with NLP libraries. Rejected because it would be more brittle and require more maintenance.

### Why OKF v0.1 Format?

**Decision**: Use Open Knowledge Framework v0.1 with project extensions.

**Rationale**:
- **Standard**: Follows emerging standard for knowledge documents
- **Extensible**: YAML frontmatter allows custom fields
- **Markdown**: Human-readable and version-control friendly
- **Tooling**: Works with existing Markdown tools

**Tradeoff**: Not yet widely adopted, limited ecosystem.

**Alternative Considered**: Custom JSON schema. Rejected because Markdown is more readable and editable.

### Why Git for Storage?

**Decision**: Store knowledge as Markdown files in Git instead of database.

**Rationale**:
- **Version Control**: Built-in history and diff tracking
- **Human-Readable**: Can edit files directly
- **Backup**: Distributed, redundant storage
- **Collaboration**: Standard workflow for contributions

**Tradeoff**: Not queryable like a database, performance issues at scale.

**Alternative Considered**: SQLite or PostgreSQL. Rejected because overkill for personal knowledge base, adds complexity.

---

## Design Tradeoffs

### Conflict Resolution: Manual vs Automated

**Decision**: Flag conflicts for manual review when two official sources contradict.

**Rationale**:
- **Safety**: Better to ask human than make wrong decision
- **Transparency**: Notes in document show what was flagged
- **Accountability**: Human takes responsibility for conflicts

**Tradeoff**: Requires human intervention, slows down ingestion.

**Alternative Considered**: Automated conflict resolution (newest wins, higher confidence wins). Rejected because could silently propagate errors.

### Concept Granularity: Atomic vs Grouped

**Decision**: Group 5-10 related facts per concept document.

**Rationale**:
- **Manageability**: Easier to navigate than thousands of single-fact files
- **Context**: Related facts provide context for each other
- **Efficiency**: Fewer files to manage
- **Readability**: Concepts read like mini-articles

**Tradeoff**: Less granular than atomic facts, harder to cite individual facts.

**Alternative Considered**: One fact per file. Rejected because would create too many files (hundreds/thousands).

### Confidence Levels: Binary vs Ternary

**Decision**: Use three confidence levels (high/medium/low) instead of binary (reliable/unreliable).

**Rationale**:
- **Nuance**: Captures spectrum of source quality
- **Decision-Making**: Helps prioritize which facts to trust
- **Flexibility**: Can adjust based on clarity, not just source

**Tradeoff**: More complex than binary, requires consistent application.

**Alternative Considered**: Binary reliable/unreliable. Rejected because doesn't capture nuances of source quality.

---

## Lessons Learned

### Hash Changes Don't Mean Content Changes

**Discovery**: During re-ingestion testing, the SHA-256 hash changed between two fetches of the same URL, but the semantic content was identical.

**Root Cause**: Dynamic page elements (timestamps, counters, rotating content) and WebReader formatting differences.

**Solution**: Validator detects duplicates at semantic level, avoiding unnecessary re-creation. System is semantically idempotent even when hashes differ.

**Takeaway**: Hash-based change detection is necessary but not sufficient. Need semantic duplicate detection for robustness.

### Natural Language Agents Need Clear Constraints

**Discovery**: Early testing showed agents would sometimes "hallucinate" or make assumptions beyond their instructions.

**Root Cause**: Natural language instructions can be ambiguous or open to interpretation.

**Solution**:
- Explicitly distinguish deterministic vs judgment operations
- Provide clear output format examples
- Specify what NOT to do (e.g., "Do NOT validate facts")
- Include edge case handling

**Takeaway**: Natural language agents require careful prompt engineering and constraint specification.

### Official Source ≠ High Confidence Automatically

**Discovery**: Some official sources had unclear, outdated, or ambiguous content.

**Root Cause**: Official docs vary in quality and clarity.

**Solution**: Confidence assignment considers both source type AND content clarity.

**Takeaway**: Source authority is necessary but not sufficient for high confidence. Content quality matters.

---

## Future Improvements

### Short Term

1. **Add More Test Sources**: Ingest all 3 planned URLs to test diverse content types
2. **Improve Hash Stability**: Normalize content before hashing to reduce false positives
3. **Add Web UI**: Simple web interface for browsing concepts
4. **Export Formats**: Support exporting to JSON, CSV for analysis

### Medium Term

1. **Relationship Tracking**: Track concept-to-concept relationships (see also, depends on)
2. **Version History**: Track fact changes over time within concepts
3. **Search Interface**: Full-text search across all concepts
4. **Confidence Decay**: Automatically lower confidence for old facts

### Long Term

1. **Multi-Repository Support**: Track multiple product domains beyond Amazon Ads
2. **Automated Testing**: Continuous testing against source changes
3. **ML Enhancement**: Use ML to suggest concept groupings and tags
4. **API Access**: REST API for programmatic access to knowledge base

---

## Performance Characteristics

### Current Scale

- **Concepts**: 5 (from 1 source)
- **Facts**: 27
- **Ingestion Time**: ~2 minutes per URL
- **Storage**: <100KB (mostly text)

### Expected Scale

- **Concepts**: 100-500 (from 10-50 sources)
- **Facts**: 500-2500
- **Ingestion Time**: ~2-5 minutes per URL
- **Storage**: <10MB (mostly text)

### Bottlenecks

1. **Web Fetching**: Network latency for fetching content
2. **Claude Processing**: Time for extraction and validation
3. **File I/O**: Writing many small files

### Optimization Opportunities

1. **Parallel Fetching**: Fetch multiple URLs simultaneously
2. **Caching**: Cache web fetches during development
3. **Batch Writing**: Write multiple files in single operation

---

## Security Considerations

### Input Validation

- URLs are validated before fetching
- Content size limits to prevent memory issues
- Hash verification ensures content integrity

### Code Execution

- Hook (validate-okf-frontmatter.js) runs locally
- No remote code execution
- Claude Code runs in sandbox

### Data Privacy

- No personal data stored
- Only public Amazon Ads content
- No authentication tokens or secrets

---

## Compliance & Attribution

### Content Licensing

- Amazon Ads content is public documentation
- Proper attribution via `resource` field
- No modification of original content, only extraction

### Citations

- Every fact includes source URL and excerpt
- Multiple sources credited when applicable
- Timestamps track when content was accessed

---

## Acknowledgments

Built with:
- **Claude Code** - AI-powered CLI for software development
- **Claude 5 (Sonnet)** - Natural language understanding
- **OKF v0.1** - Open Knowledge Framework standard

Inspired by:
- **Digital Gardens** - Personal knowledge management
- **Obsidian** - Markdown-based knowledge bases
- **ETL Pipelines** - Data processing patterns

---

**Last Updated**: 2026-08-10T20:33:33Z
**Version**: 0.1.0
