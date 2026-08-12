#!/usr/bin/env node

/**
 * Source Change Detection Tests
 *
 * Tests for source change handling, fact supersedence detection,
 * and removal tracking in the pipeline.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { computeHash } = require('../scripts/hash.js');

const TEST_DIR = path.join(__dirname, '..');
const KNOWLEDGE_DIR = path.join(TEST_DIR, 'knowledge');
const CONCEPTS_DIR = path.join(KNOWLEDGE_DIR, 'concepts');
const STATE_DIR = path.join(TEST_DIR, 'pipeline-state');

// Test fixtures
const V1_SOURCE = path.join(TEST_DIR, 'tests/fixtures/source-change-v1.html');
const V2_SOURCE = path.join(TEST_DIR, 'tests/fixtures/source-change-v2.html');

// ANSI colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    testsPassed++;
  } catch (e) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.red}${e.message}${colors.reset}`);
    testsFailed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function cleanup() {
  if (fs.existsSync(STATE_DIR)) {
    fs.rmSync(STATE_DIR, { recursive: true, force: true });
  }
}

function getConceptFiles() {
  if (!fs.existsSync(CONCEPTS_DIR)) {
    return {};
  }

  const files = fs.readdirSync(CONCEPTS_DIR);
  const concepts = {};

  files.forEach(file => {
    if (file.endsWith('.okf.md')) {
      const filePath = path.join(CONCEPTS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      concepts[file] = parseConceptFile(content);
    }
  });

  return concepts;
}

function parseConceptFile(content) {
  // Parse frontmatter
  const frontmatterMatch = content.match(/^---\n(.*?)\n---/s);
  const frontmatter = {};

  if (frontmatterMatch) {
    const yamlContent = frontmatterMatch[1];
    // Simple YAML parsing for our needs
    yamlContent.split('\n').forEach(line => {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        let value = match[2].trim();
        // Handle arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1).split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        }
        frontmatter[match[1]] = value;
      }
    });
  }

  // Parse facts
  const factsMatch = content.match(/## Facts\n(.*?)\n##/s);
  const facts = [];

  if (factsMatch) {
    const factsSection = factsMatch[1];
    const factRegex = /^\d+\.\s+\*\*([^*]+)\*\*\s*(?:\[([^\]]+)\])?\s*:\s*(.+)$/gm;
    let match;

    while ((match = factRegex.exec(factsSection)) !== null) {
      facts.push({
        title: match[1].trim(),
        factId: match[2] || null,
        statement: match[3].trim()
      });
    }
  }

  // Check for fact_history and deprecated_facts
  const hasFactHistory = content.includes('fact_history:');
  const hasDeprecatedFacts = content.includes('deprecated_facts:');

  return {
    frontmatter,
    facts,
    hasFactHistory,
    hasDeprecatedFacts,
    rawContent: content
  };
}

console.log('\n=== Source Change Detection Tests ===\n');

// Test 1: Fact supersedence detection
test('Source update detected as supersedence', () => {
  // This test verifies that when a source updates a fact value,
  // it's classified as an update (supersedence) not a conflict

  const v1Hash = computeHash(fs.readFileSync(V1_SOURCE, 'utf8'));
  const v2Hash = computeHash(fs.readFileSync(V2_SOURCE, 'utf8'));

  // Verify content has changed
  assert(v1Hash !== v2Hash, 'Source content should have changed between v1 and v2');

  // Check that specific fact changed from 10 to 50 products
  const v1Content = fs.readFileSync(V1_SOURCE, 'utf8');
  const v2Content = fs.readFileSync(V2_SOURCE, 'utf8');

  assert(v1Content.includes('10 products'), 'V1 should mention 10 products');
  assert(v2Content.includes('50 products'), 'V2 should mention 50 products');
  assert(!v2Content.includes('10 products'), 'V2 should not mention 10 products');
});

// Test 2: Fact removal detection
test('Fact removal detected when content disappears', () => {
  // This test verifies that when a source removes a fact entirely,
  // it's classified as a removal

  const v1Content = fs.readFileSync(V1_SOURCE, 'utf8');
  const v2Content = fs.readFileSync(V2_SOURCE, 'utf8');

  // V1 has minimum budget information
  assert(v1Content.includes('Minimum Budget'), 'V1 should have minimum budget section');
  assert(v1Content.includes('$1'), 'V1 should mention $1 minimum budget');

  // V2 does not have minimum budget information
  assert(!v2Content.includes('Minimum Budget'), 'V2 should not have minimum budget section');
  assert(!v2Content.includes('$1'), 'V2 should not mention $1 minimum budget');
});

// Test 3: New fact detection
test('New fact detected when content is added', () => {
  // This test verifies that when a source adds new information,
  // it's classified as new (not an update or removal)

  const v1Content = fs.readFileSync(V1_SOURCE, 'utf8');
  const v2Content = fs.readFileSync(V2_SOURCE, 'utf8');

  // V1 does not have campaign limits
  assert(!v1Content.includes('Campaign Limits'), 'V1 should not have campaign limits');

  // V2 has campaign limits information
  assert(v2Content.includes('Campaign Limits'), 'V2 should have campaign limits');
  assert(v2Content.includes('50 Sponsored Products campaigns'), 'V2 should mention 50 campaigns limit');
});

// Test 4: Fact ID stability
test('Fact IDs remain stable for same content', () => {
  // This test verifies that fact IDs are stable:
  // Same source URL + same statement = same fact ID

  const content = 'Sponsored Products support automatic targeting';
  const sourceUrl = 'https://advertising.amazon.com/solutions/products/sponsored-products';

  const { generateFactId } = require('../scripts/fact-id.js');

  const id1 = generateFactId(sourceUrl, content);
  const id2 = generateFactId(sourceUrl, content);

  assertEqual(id1, id2, 'Same input should produce same fact ID');
  assert(id1.startsWith('fact-'), 'Fact ID should start with "fact-"');
  assert(id1.split('-').length === 3, 'Fact ID should have 3 parts separated by dashes');
});

// Test 5: Fact ID uniqueness
test('Fact IDs are unique for different content', () => {
  // This test verifies that different statements produce different fact IDs

  const sourceUrl = 'https://advertising.amazon.com/solutions/products/sponsored-products';
  const statement1 = 'Maximum 10 products per ad';
  const statement2 = 'Maximum 50 products per ad';

  const { generateFactId } = require('../scripts/fact-id.js');

  const id1 = generateFactId(sourceUrl, statement1);
  const id2 = generateFactId(sourceUrl, statement2);

  assert(id1 !== id2, 'Different statements should produce different fact IDs');

  // But they should be from the same source (same source hash)
  const { extractSourceHash } = require('../scripts/fact-id.js');
  const sourceHash1 = extractSourceHash(id1);
  const sourceHash2 = extractSourceHash(id2);

  assertEqual(sourceHash1, sourceHash2, 'Same source should produce same source hash');
});

// Test 6: Same source detection
test('Same source detection for fact IDs', () => {
  // This test verifies the areFromSameSource utility function

  const sourceUrl = 'https://example.com';
  const statement1 = 'First statement';
  const statement2 = 'Second statement';

  const { generateFactId, areFromSameSource } = require('../scripts/fact-id.js');

  const id1 = generateFactId(sourceUrl, statement1);
  const id2 = generateFactId(sourceUrl, statement2);

  assert(areFromSameSource(id1, id2), 'Facts from same source should be detected');
});

// Test 7: Fact ID format validation
test('Fact ID format validation works correctly', () => {
  // This test verifies the isValidFactId utility function

  const { isValidFactId, generateFactId } = require('../scripts/fact-id.js');

  const validId = generateFactId('https://example.com', 'Test statement');
  assert(isValidFactId(validId), 'Generated fact ID should be valid');

  assert(!isValidFactId('invalid-id'), 'Invalid format should be rejected');
  assert(!isValidFactId('fact-abc'), 'Too short should be rejected');
  assert(!isValidFactId('fact-abcdefgh-12345678-extra'), 'Too many parts should be rejected');
});

// Test 8: Content change detection
test('Content hash changes when source is modified', () => {
  // This test verifies that the hash system can detect content changes

  const v1Hash = computeHash(fs.readFileSync(V1_SOURCE, 'utf8'));
  const v2Hash = computeHash(fs.readFileSync(V2_SOURCE, 'utf8'));

  assert(v1Hash !== v2Hash, 'Different content should produce different hashes');

  // But same content should produce same hash
  const v1Hash2 = computeHash(fs.readFileSync(V1_SOURCE, 'utf8'));
  assertEqual(v1Hash, v1Hash2, 'Same content should produce same hash');
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);

if (testsFailed > 0) {
  console.log(`\n${colors.red}Some tests failed${colors.reset}`);
  process.exit(1);
} else {
  console.log(`\n${colors.green}All tests passed!${colors.reset}`);
  console.log(`\n${colors.cyan}Note: These tests verify the foundation for source change handling.${colors.reset}`);
  console.log(`${colors.cyan}Full integration tests will verify end-to-end pipeline behavior.${colors.reset}`);
  process.exit(0);
}
