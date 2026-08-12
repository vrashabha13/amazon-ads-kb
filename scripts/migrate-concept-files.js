#!/usr/bin/env node

/**
 * Concept File Migration Script
 *
 * Adds fact IDs to existing concept files that don't have them.
 * Adds fact_history and deprecated_facts fields where applicable.
 *
 * This script migrates from the old format:
 *   **Title**: statement
 * To the new format:
 *   **Title** [fact-xxxxxxxx-yyyyyyyy]: statement
 */

const fs = require('fs');
const path = require('path');
const { generateFactId } = require('./fact-id.js');

const CONCEPTS_DIR = path.join(process.cwd(), 'knowledge/concepts');
const BACKUP_DIR = path.join(process.cwd(), 'knowledge/concepts/backup');

// ANSI colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

/**
 * Extract source URL from concept file frontmatter
 */
function extractSourceUrl(content) {
  const resourceMatch = content.match(/^resource:\s*(.+)$/m);
  if (resourceMatch) {
    return resourceMatch[1].trim();
  }
  return null;
}

/**
 * Extract facts from concept file body
 */
function extractFacts(content) {
  const facts = [];

  // Find the Facts section
  const factsSectionMatch = content.match(/## Facts\n([\s\S]+?)\n##/);
  if (!factsSectionMatch) {
    return facts;
  }

  const factsSection = factsSectionMatch[1];

  // Parse each fact
  const factRegex = /^(\d+)\.\s+\*\*([^*]+)\*\*:\s*(.+)$/gm;
  let match;

  while ((match = factRegex.exec(factsSection)) !== null) {
    facts.push({
      number: match[1],
      title: match[2].trim(),
      statement: match[3].trim()
    });
  }

  return facts;
}

/**
 * Check if fact already has fact ID
 */
function hasFactId(factNumber, title, content) {
  // Reconstruct the fact line to check if it contains a fact ID
  const factPattern = new RegExp(`^${factNumber}\\.\\s+\\*\\*${title}\\*\\*\\s+\\[fact-`, 'm');
  return factPattern.test(content);
}

/**
 * Migrate a single concept file
 */
function migrateConceptFile(filePath) {
  console.log(`  Processing: ${path.basename(filePath)}`);

  let content = fs.readFileSync(filePath, 'utf8');
  const sourceUrl = extractSourceUrl(content);

  if (!sourceUrl) {
    console.log(`    ${colors.yellow}⚠ No source URL found, skipping${colors.reset}`);
    return { migrated: false, reason: 'no_source_url' };
  }

  const facts = extractFacts(content);
  let factIdsAdded = 0;
  let alreadyMigrated = true;

  // Check if already migrated
  const existingFacts = facts.filter(fact => {
    return hasFactId(fact.number, fact.title, content);
  });

  if (existingFacts.length > 0) {
    console.log(`    ${colors.green}✓ Already migrated (${existingFacts.length}/${facts.length} facts have IDs)${colors.reset}`);
    return { migrated: false, reason: 'already_migrated', factCount: facts.length, idsFound: existingFacts.length };
  }

  // Migrate each fact
  content = content.replace(/^(\d+)\.\s+\*\*([^*]+)\*\*:\s*(.+)$/gm, (match, num, title, statement) => {
    // Check if already has fact ID
    const factIdPattern = new RegExp(`^${num}\\.\\s+\\*\\*${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*\\s+\\[fact-`, 'm');
    if (factIdPattern.test(content)) {
      return match; // Already has fact ID, skip
    }

    // Generate fact ID
    const factId = generateFactId(sourceUrl, statement);
    factIdsAdded++;

    return `${num}. **${title}** [${factId}]: ${statement}`;
  });

  // Add empty lineage fields to frontmatter if not present
  if (!content.includes('fact_history:')) {
    // Find the frontmatter end
    const frontmatterEndMatch = content.match(/^---$/m);
    if (frontmatterEndMatch) {
      // Find the position after the first --- (end of frontmatter)
      const lines = content.split('\n');
      let frontmatterEndIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i] === '---' && i > 0) {
          frontmatterEndIndex = i;
          break;
        }
      }

      if (frontmatterEndIndex > 0) {
        // Insert empty lineage fields before frontmatter end
        lines.splice(frontmatterEndIndex, 0,
          'fact_history: {}',
          'deprecated_facts: []'
        );

        content = lines.join('\n');
        console.log(`    ${colors.cyan}➕ Added empty lineage fields to frontmatter${colors.reset}`);
      }
    }
  }

  // Write migrated content
  fs.writeFileSync(filePath, content, 'utf8');

  console.log(`    ${colors.green}✓ Migrated (${factIdsAdded}/${facts.length} facts updated)${colors.reset}`);

  return {
    migrated: true,
    factCount: facts.length,
    idsAdded: factIdsAdded,
    sourceUrl: sourceUrl
  };
}

/**
 * Create backup of existing concept files
 */
function createBackup() {
  if (fs.existsSync(BACKUP_DIR)) {
    console.log(`  ${colors.yellow}Backup directory already exists${colors.reset}`);
    return;
  }

  console.log(`  Creating backup: ${BACKUP_DIR}`);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const files = fs.readdirSync(CONCEPTS_DIR);
  files.forEach(file => {
    if (file.endsWith('.okf.md')) {
      const srcPath = path.join(CONCEPTS_DIR, file);
      const destPath = path.join(BACKUP_DIR, file);
      fs.copyFileSync(srcPath, destPath);
    }
  });

  console.log(`    ${colors.green}✓ Backed up ${files.length} concept files${colors.reset}`);
}

/**
 * Main migration process
 */
function main() {
  console.log('\n=== Concept File Migration ===\n');
  console.log(`${colors.cyan}Migrating concept files to include fact IDs...${colors.reset}\n`);

  // Create backup
  createBackup();

  // Process each concept file
  const files = fs.readdirSync(CONCEPTS_DIR);
  const conceptFiles = files.filter(file => file.endsWith('.okf.md'));

  console.log(`  Found ${conceptFiles.length} concept files to process\n`);

  let migrated = 0;
  let skipped = 0;
  let totalFacts = 0;
  let totalIdsAdded = 0;

  conceptFiles.forEach(file => {
    const filePath = path.join(CONCEPTS_DIR, file);

    try {
      const result = migrateConceptFile(filePath);

      if (result.migrated) {
        migrated++;
        totalFacts += result.factCount;
        totalIdsAdded += result.idsAdded;
      } else {
        skipped++;
        if (result.reason === 'already_migrated') {
          totalFacts += result.factCount || 0;
          totalIdsAdded += result.idsFound || 0;
        }
      }
    } catch (error) {
      console.log(`    ${colors.red}✗ Error processing ${file}: ${error.message}${colors.reset}`);
    }
  });

  // Summary
  console.log(`\n=== Migration Summary ===`);
  console.log(`${colors.green}Migrated: ${migrated} files${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${skipped} files${colors.reset}`);
  console.log(`${colors.cyan}Total facts processed: ${totalFacts}${colors.reset}`);
  console.log(`${colors.cyan}Total fact IDs added: ${totalIdsAdded}${colors.reset}`);

  if (migrated > 0) {
    console.log(`\n${colors.green}✅ Migration complete!${colors.reset}`);
    console.log(`\nBackup stored in: ${BACKUP_DIR}`);
    console.log(`To restore: mv ${BACKUP_DIR}/*.okf.md knowledge/concepts/`);
  } else {
    console.log(`\n${colors.yellow}⚠ All files already migrated${colors.reset}`);
  }
}

// Run migration
if (require.main === module) {
  main();
}

module.exports = { migrateConceptFile, extractSourceUrl, extractFacts };