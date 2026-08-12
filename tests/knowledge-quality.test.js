#!/usr/bin/env node

/**
 * Knowledge Quality Tests
 *
 * Tests for verifying knowledge bundle meets quality requirements:
 * - Source count (>=5)
 * - Concept count (10-15)
 * - Product breadth (>=3 areas)
 * - Cross-links (valid, not broken)
 * - Multi-source concepts (>=2)
 * - Merge behavior
 * - Provenance preservation
 * - Frontmatter validity
 */

const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '..');
const CONCEPTS_DIR = path.join(TEST_DIR, 'knowledge', 'concepts');
const MANIFEST_PATH = path.join(TEST_DIR, 'knowledge', '.manifest.json');

// ANSI colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    console.log(`\n${colors.cyan}Testing:${colors.reset} ${name}`);
    fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    testsPassed++;
  } catch (e) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.red}${e.message}${colors.reset}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

console.log('\n=== Knowledge Quality Tests ===\n');

// Test 1: Source Count
test('At least 5 distinct sources', () => {
  assert(fs.existsSync(MANIFEST_PATH), 'Manifest file should exist');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const sources = Object.keys(manifest.sources || {});
  console.log(`  Current source count: ${sources.length}`);
  assert(sources.length >= 5, `Expected >=5 sources, got ${sources.length}`);
  console.log(`  Sources: ${sources.map(s => s.substring(0, 50) + '...').join('\n    ')}`);
});

// Test 2: Concept Count
test('Between 10 and 15 concept documents', () => {
  const concepts = fs.readdirSync(CONCEPTS_DIR)
    .filter(f => f.endsWith('.okf.md'));
  console.log(`  Current concept count: ${concepts.length}`);
  assert(concepts.length >= 10 && concepts.length <= 15,
    `Expected 10-15 concepts, got ${concepts.length}`);
  console.log(`  Concepts: ${concepts.join(', ')}`);
});

// Test 3: Product Breadth
test('Covers at least 3 product areas', () => {
  const concepts = fs.readdirSync(CONCEPTS_DIR)
    .filter(f => f.endsWith('.okf.md'));

  const productAreas = new Set();
  concepts.forEach(file => {
    const content = fs.readFileSync(path.join(CONCEPTS_DIR, file), 'utf-8');
    const tagsMatch = content.match(/tags:\s*\n((?:  - .+\n)+)/);
    if (tagsMatch) {
      tagsMatch[1].split('\n').forEach(tagLine => {
        const match = tagLine.match(/products\/([^/]+)/);
        if (match) productAreas.add(match[1]);
      });
    }
  });

  console.log(`  Product areas count: ${productAreas.size}`);
  console.log(`  Product areas: ${Array.from(productAreas).join(', ')}`);
  assert(productAreas.size >= 3,
    `Expected >=3 product areas, got ${productAreas.size}`);
});

// Test 4: Cross-Links
test('Cross-links are valid (no broken links)', () => {
  const concepts = fs.readdirSync(CONCEPTS_DIR)
    .filter(f => f.endsWith('.okf.md'));

  let totalLinks = 0;
  let brokenLinks = 0;
  const validLinks = [];

  concepts.forEach(file => {
    const content = fs.readFileSync(path.join(CONCEPTS_DIR, file), 'utf-8');
    const links = content.match(/\[([^\]]+)\]\(concepts\/([^)]+)\.okf\.md\)/g) || [];

    links.forEach(link => {
      totalLinks++;
      const targetFile = link.match(/\(concepts\/([^)]+)\.okf\.md\)/)[1] + '.okf.md';
      if (fs.existsSync(path.join(CONCEPTS_DIR, targetFile))) {
        validLinks.push(`${file} → ${targetFile}`);
      } else {
        brokenLinks++;
        console.log(`  ${colors.red}Broken link:${colors.reset} ${file} → ${targetFile}`);
      }
    });
  });

  console.log(`  Total cross-links: ${totalLinks}`);
  console.log(`  Valid cross-links: ${validLinks.length}`);
  assert(brokenLinks === 0, `Found ${brokenLinks} broken links`);
  if (validLinks.length > 0 && validLinks.length <= 10) {
    console.log(`  Sample valid links: ${validLinks.slice(0, 3).join(', ')}`);
  }
});

// Test 5: Multi-Source Concepts
test('At least 2 multi-source concepts', () => {
  const concepts = fs.readdirSync(CONCEPTS_DIR)
    .filter(f => f.endsWith('.okf.md'));

  let multiSourceCount = 0;
  const multiSourceConcepts = [];

  concepts.forEach(file => {
    const content = fs.readFileSync(path.join(CONCEPTS_DIR, file), 'utf-8');
    const match = content.match(/sources_count:\s*(\d+)/);
    if (match && parseInt(match[1]) >= 2) {
      multiSourceCount++;
      multiSourceConcepts.push(`${file} (sources_count: ${match[1]})`);
    }
  });

  console.log(`  Multi-source concepts count: ${multiSourceCount}`);
  if (multiSourceConcepts.length > 0) {
    console.log(`  Multi-source concepts: ${multiSourceConcepts.join(', ')}`);
  }
  assert(multiSourceCount >= 2,
    `Expected >=2 multi-source concepts, got ${multiSourceCount}`);
});

// Test 6: Merge Behavior
test('Merge case demonstrates fact combination', () => {
  const concepts = fs.readdirSync(CONCEPTS_DIR)
    .filter(f => f.endsWith('.okf.md'));

  let multiSourceFound = false;
  concepts.forEach(file => {
    const content = fs.readFileSync(path.join(CONCEPTS_DIR, file), 'utf-8');
    const match = content.match(/sources_count:\s*(\d+)/);
    if (match && parseInt(match[1]) >= 2) {
      multiSourceFound = true;
      console.log(`  Checking multi-source concept: ${file}`);

      // Check for multiple source citations in body
      const sourceLinks = content.match(/https:\/\/[^)\s]+/g) || [];
      const uniqueSources = new Set(sourceLinks);
      console.log(`    Source citations found: ${uniqueSources.size}`);
      assert(uniqueSources.size >= 2,
        `${file}: Multi-source concept should cite multiple sources`);
    }
  });

  assert(multiSourceFound, 'Should have at least one multi-source concept');
});

// Test 7: Provenance Preservation
test('Multi-source concepts preserve provenance', () => {
  const concepts = fs.readdirSync(CONCEPTS_DIR)
    .filter(f => f.endsWith('.okf.md'));

  let multiSourceCount = 0;
  concepts.forEach(file => {
    const content = fs.readFileSync(path.join(CONCEPTS_DIR, file), 'utf-8');
    const match = content.match(/sources_count:\s*(\d+)/);
    if (match && parseInt(match[1]) >= 2) {
      multiSourceCount++;
      console.log(`  Checking provenance: ${file}`);

      // Check for source citations
      assert(content.includes('## Sources'),
        `${file}: Multi-source concept should have Sources section`);

      // Check frontmatter fields
      assert(content.includes('confidence:'),
        `${file}: Should have confidence field`);
      assert(content.includes('official_source:'),
        `${file}: Should have official_source field`);
      assert(content.includes('last_checked:'),
        `${file}: Should have last_checked field`);
    }
  });

  console.log(`  Multi-source concepts with provenance: ${multiSourceCount}`);
  assert(multiSourceCount >= 2,
    `Expected >=2 multi-source concepts with provenance`);
});

// Test 8: Frontmatter Validity
test('All concepts pass OKF frontmatter validation', () => {
  const concepts = fs.readdirSync(CONCEPTS_DIR)
    .filter(f => f.endsWith('.okf.md'));

  const REQUIRED_FIELDS = [
    'type', 'title', 'description', 'resource', 'tags', 'timestamp',
    'confidence', 'sources_count', 'official_source', 'last_checked'
  ];

  let validConcepts = 0;
  concepts.forEach(file => {
    const content = fs.readFileSync(path.join(CONCEPTS_DIR, file), 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    assert(frontmatterMatch, `${file}: Missing frontmatter`);

    const frontmatter = frontmatterMatch[1];
    const missing = REQUIRED_FIELDS.filter(field =>
      !new RegExp(`^${field}:`, 'm').test(frontmatter)
    );

    if (missing.length === 0) {
      validConcepts++;
    } else {
      console.log(`  ${colors.yellow}${file}:${colors.reset} Missing fields: ${missing.join(', ')}`);
    }

    assert(missing.length === 0,
      `${file}: Missing fields: ${missing.join(', ')}`);
  });

  console.log(`  Valid concepts: ${validConcepts}/${concepts.length}`);
});

// Test 9: Existing Functionality
test('Existing tests still pass', () => {
  const { execSync } = require('child_process');

  try {
    console.log('  Running pipeline tests...');
    execSync('node tests/pipeline.test.js', { cwd: TEST_DIR, stdio: ['ignore', 'ignore', 'ignore'] });
    console.log('  Pipeline tests: PASSED');

    console.log('  Running idempotency tests...');
    execSync('node tests/idempotency.test.js', { cwd: TEST_DIR, stdio: ['ignore', 'ignore', 'ignore'] });
    console.log('  Idempotency tests: PASSED');

    console.log('  Running hook integration tests...');
    execSync('./tests/test-hook-integration.sh', { cwd: TEST_DIR, shell: '/bin/bash', stdio: ['ignore', 'ignore', 'ignore'] });
    console.log('  Hook integration tests: PASSED');
  } catch (e) {
    throw new Error('Existing tests failed - check output above');
  }
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);

if (testsFailed > 0) {
  console.log(`\n${colors.red}Some tests failed${colors.reset}`);
  process.exit(1);
} else {
  console.log(`\n${colors.green}All knowledge quality tests passed!${colors.reset}`);
  process.exit(0);
}
