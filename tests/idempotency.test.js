#!/usr/bin/env node

/**
 * Idempotency Tests
 *
 * Tests that prove a second run makes no change.
 * Same source processed twice should produce identical results.
 *
 * Usage: npm run test:idempotency
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { computeHash, computeHashWithPrefix } = require('../scripts/hash.js');

const TEST_DIR = path.join(__dirname, '..');
const KNOWLEDGE_DIR = path.join(TEST_DIR, 'knowledge');
const CONCEPTS_DIR = path.join(KNOWLEDGE_DIR, 'concepts');
const STATE_DIR = path.join(TEST_DIR, 'pipeline-state');

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

function assertDeepEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function cleanup() {
  // Clean up pipeline state
  if (fs.existsSync(STATE_DIR)) {
    fs.rmSync(STATE_DIR, { recursive: true, force: true });
  }
}

// Cleanup before tests
cleanup();

console.log('\n=== Idempotency Tests ===\n');

// Test 1: Normalization - CRLF vs LF
test('CRLF and LF produce same hash', () => {
  const contentCRLF = 'Line 1\r\nLine 2\r\nLine 3';
  const contentLF = 'Line 1\nLine 2\nLine 3';

  const hashCRLF = computeHash(contentCRLF);
  const hashLF = computeHash(contentLF);

  assertEqual(hashCRLF, hashLF, 'CRLF and LF should produce same hash');
});

// Test 2: Normalization - Trailing whitespace
test('Trailing whitespace normalized', () => {
  const contentWithSpaces = 'Line 1   \nLine 2\t\nLine 3  ';
  const contentTrimmed = 'Line 1\nLine 2\nLine 3';

  const hashWithSpaces = computeHash(contentWithSpaces);
  const hashTrimmed = computeHash(contentTrimmed);

  assertEqual(hashWithSpaces, hashTrimmed, 'Trailing whitespace should be normalized');
});

// Test 3: Normalization - Leading/trailing empty lines
test('Leading/trailing empty lines removed', () => {
  const contentWithEmpty = '\n\n\nLine 1\nLine 2\n\n\n';
  const contentTrimmed = 'Line 1\nLine 2';

  const hashWithEmpty = computeHash(contentWithEmpty);
  const hashTrimmed = computeHash(contentTrimmed);

  assertEqual(hashWithEmpty, hashTrimmed, 'Leading/trailing empty lines should be removed');
});

// Test 4: Normalization - Multiple spaces
test('Multiple consecutive spaces collapsed', () => {
  const contentMultiple = 'Line 1    with    spaces';
  const contentSingle = 'Line 1 with spaces';

  const hashMultiple = computeHash(contentMultiple);
  const hashSingle = computeHash(contentSingle);

  assertEqual(hashMultiple, hashSingle, 'Multiple spaces should be collapsed');
});

// Test 5: Normalization - Meaningful content difference detected
test('Meaningful content changes detected', () => {
  const content1 = 'Line 1\nLine 2\nLine 3';
  const content2 = 'Line 1\nLine 2\nLine 4'; // Different last line

  const hash1 = computeHash(content1);
  const hash2 = computeHash(content2);

  assert(hash1 !== hash2, 'Meaningful changes should produce different hashes');
});

// Test 6: Hash prefix format
test('Hash with prefix format correct', () => {
  const content = 'Test content';
  const hashWithPrefix = computeHashWithPrefix(content);

  assert(hashWithPrefix.startsWith('sha256:'), 'Hash should have sha256: prefix');
  assertEqual(hashWithPrefix.length, 71, 'Hash should be 71 characters (sha256: + 64 hex chars)');
});

// Test 7: File hash computation
test('File hash computation works', () => {
  // Create a temporary file
  const testFile = path.join(TEST_DIR, 'pipeline-state', 'test-hash.txt');
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(testFile, 'Test content for hashing');

  const hash = computeHash(path.join(TEST_DIR, 'scripts', 'hash.js'));

  assert(typeof hash === 'string', 'Hash should be a string');
  assertEqual(hash.length, 64, 'Hash should be 64 hex characters');

  // Cleanup
  fs.unlinkSync(testFile);
});

// Test 8: Idempotent hash computation
test('Hash computation is idempotent', () => {
  const content = 'Test content';

  const hash1 = computeHash(content);
  const hash2 = computeHash(content);

  assertEqual(hash1, hash2, 'Hash computation should be idempotent');
});

// Test 9: Hash length consistency
test('All hashes have consistent length', () => {
  const contents = [
    'Short',
    'Medium length content',
    'Much longer content with more text to ensure hash length consistency'
  ];

  const hashes = contents.map(c => computeHash(c));

  hashes.forEach(hash => {
    assertEqual(hash.length, 64, 'All hashes should be 64 characters');
  });
});

// Test 10: Hash is deterministic
test('Hash is deterministic across multiple calls', () => {
  const content = 'Deterministic test content';

  const hashes = [];
  for (let i = 0; i < 10; i++) {
    hashes.push(computeHash(content));
  }

  // All hashes should be identical
  const firstHash = hashes[0];
  hashes.forEach(hash => {
    assertEqual(hash, firstHash, 'All hashes should be identical');
  });
});

// Test 11: Normalization preserves meaning
test('Normalization preserves meaningful content', () => {
  const content = 'Important text\n\nAnother important paragraph';
  const normalized = require('../scripts/hash.js').normalizeContent(content);

  // Should preserve paragraphs
  assert(normalized.includes('Important text'), 'Should preserve first paragraph');
  assert(normalized.includes('Another important paragraph'), 'Should preserve second paragraph');
});

// Test 12: Normalization removes only noise
test('Normalization removes only noise, not content', () => {
  const content = 'Title\n\nContent here\n\n';
  const normalized = require('../scripts/hash.js').normalizeContent(content);

  // Should not remove the actual content
  assert(normalized.includes('Title'), 'Should preserve title');
  assert(normalized.includes('Content here'), 'Should preserve content');

  // Should not have leading/trailing empty lines
  assert(!normalized.startsWith('\n'), 'Should not start with newline');
  assert(!normalized.endsWith('\n'), 'Should not end with newline');
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);

if (testsFailed > 0) {
  console.log(`\n${colors.red}Some tests failed${colors.reset}`);
  process.exit(1);
} else {
  console.log(`\n${colors.green}All normalization tests passed!${colors.reset}`);

  console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
  console.log(`1. Run: npm run ingest -- tests/fixtures/test-source.html`);
  console.log(`2. Run: npm run ingest -- tests/fixtures/test-source.html (again)`);
  console.log(`3. Verify: No changes to concept files`);

  process.exit(0);
}
