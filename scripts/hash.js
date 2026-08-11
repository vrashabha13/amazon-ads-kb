#!/usr/bin/env node

/**
 * Content Normalization and Hashing Module
 *
 * Provides deterministic content normalization and SHA-256 hashing
 * to ensure idempotent pipeline execution.
 *
 * Key insight: Same logical content should always produce the same hash,
 * regardless of formatting differences, dynamic elements, or line endings.
 */

const crypto = require('crypto');

/**
 * Normalize content for consistent hashing
 *
 * Normalization rules:
 * 1. CRLF (\r\n) → LF (\n)
 * 2. Trim trailing whitespace from each line
 * 3. Remove leading/trailing empty lines
 * 4. Collapse multiple consecutive spaces to single space
 * 5. Trim leading/trailing whitespace from entire content
 *
 * DO NOT remove:
 * - HTML comments (may contain semantic information)
 * - Meaningful content
 *
 * @param {string} content - Raw content to normalize
 * @returns {string} Normalized content
 */
function normalizeContent(content) {
  if (typeof content !== 'string') {
    throw new Error('Content must be a string');
  }

  // Convert to string if needed (for buffers or other types)
  const text = String(content);

  // Step 1: CRLF → LF
  let normalized = text.replace(/\r\n/g, '\n');

  // Step 2: Trim trailing whitespace from each line
  normalized = normalized.split('\n').map(line => line.trimEnd()).join('\n');

  // Step 3: Remove leading/trailing empty lines
  const lines = normalized.split('\n');
  let startIdx = 0;
  let endIdx = lines.length;

  // Find first non-empty line
  while (startIdx < endIdx && lines[startIdx].trim() === '') {
    startIdx++;
  }

  // Find last non-empty line
  while (endIdx > startIdx && lines[endIdx - 1].trim() === '') {
    endIdx--;
  }

  if (startIdx >= endIdx) {
    // Content is entirely whitespace
    return '';
  }

  normalized = lines.slice(startIdx, endIdx).join('\n');

  // Step 4: Collapse multiple consecutive spaces to single space
  // But preserve newlines
  normalized = normalized.replace(/[ \t]+/g, ' ');

  // Step 5: Trim leading/trailing whitespace from entire content
  normalized = normalized.trim();

  return normalized;
}

/**
 * Compute SHA-256 hash of content
 *
 * Always hashes NORMALIZED content to ensure idempotency
 *
 * @param {string} content - Raw content to hash
 * @returns {string} SHA-256 hash (hex format, without 'sha256:' prefix)
 */
function computeHash(content) {
  const normalized = normalizeContent(content);
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Compute SHA-256 hash with prefix
 *
 * Returns hash in the format used by the manifest: 'sha256:...'
 *
 * @param {string} content - Raw content to hash
 * @returns {string} SHA-256 hash with 'sha256:' prefix
 */
function computeHashWithPrefix(content) {
  const hash = computeHash(content);
  return `sha256:${hash}`;
}

/**
 * Check if two content strings are semantically identical
 * (produce the same normalized hash)
 *
 * @param {string} content1 - First content
 * @param {string} content2 - Second content
 * @returns {boolean} True if contents are semantically identical
 */
function isContentIdentical(content1, content2) {
  return computeHash(content1) === computeHash(content2);
}

/**
 * Normalize and return content (for storage)
 *
 * This should be used whenever content is stored to disk,
 * ensuring consistency between runs.
 *
 * @param {string} content - Raw content to normalize
 * @returns {string} Normalized content ready for storage
 */
function normalizeForStorage(content) {
  return normalizeContent(content);
}

/**
 * Compute hash of a file
 *
 * @param {string} filePath - Path to file
 * @returns {string} SHA-256 hash (hex format)
 */
function computeFileHash(filePath) {
  const fs = require('fs');
  const content = fs.readFileSync(filePath, 'utf8');
  return computeHash(content);
}

/**
 * Test if two files have identical normalized content
 *
 * @param {string} filePath1 - Path to first file
 * @param {string} filePath2 - Path to second file
 * @returns {boolean} True if files are semantically identical
 */
function areFilesIdentical(filePath1, filePath2) {
  return computeFileHash(filePath1) === computeFileHash(filePath2);
}

// Export functions
module.exports = {
  normalizeContent,
  computeHash,
  computeHashWithPrefix,
  isContentIdentical,
  normalizeForStorage,
  computeFileHash,
  areFilesIdentical
};

// If run directly, perform a simple test
if (require.main === module) {
  const testCases = [
    {
      name: 'CRLF vs LF',
      content1: 'Line 1\r\nLine 2\r\nLine 3',
      content2: 'Line 1\nLine 2\nLine 3',
      expectedIdentical: true
    },
    {
      name: 'Trailing whitespace',
      content1: 'Line 1   \nLine 2\t\nLine 3  ',
      content2: 'Line 1\nLine 2\nLine 3',
      expectedIdentical: true
    },
    {
      name: 'Leading/trailing empty lines',
      content1: '\n\n\nLine 1\nLine 2\n\n\n',
      content2: 'Line 1\nLine 2',
      expectedIdentical: true
    },
    {
      name: 'Multiple spaces',
      content1: 'Line 1    with    spaces',
      content2: 'Line 1 with spaces',
      expectedIdentical: true
    },
    {
      name: 'Different content',
      content1: 'Line 1\nLine 2\nLine 3',
      content2: 'Line 1\nLine 2\nLine 4',
      expectedIdentical: false
    }
  ];

  console.log('=== Hash Module Tests ===\n');
  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, i) => {
    const hash1 = computeHash(testCase.content1);
    const hash2 = computeHash(testCase.content2);
    const identical = hash1 === hash2;
    const expected = testCase.expectedIdentical;

    if (identical === expected) {
      console.log(`✓ Test ${i + 1}: ${testCase.name} - PASS`);
      passed++;
    } else {
      console.log(`✗ Test ${i + 1}: ${testCase.name} - FAIL`);
      console.log(`  Expected: ${expected ? 'Identical' : 'Different'}`);
      console.log(`  Got: ${identical ? 'Identical' : 'Different'}`);
      console.log(`  Hash 1: ${hash1}`);
      console.log(`  Hash 2: ${hash2}`);
      failed++;
    }
  });

  console.log(`\n=== Results ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${testCases.length}`);

  process.exit(failed > 0 ? 1 : 0);
}
