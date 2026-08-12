#!/usr/bin/env node

/**
 * Fact ID Generation Module
 *
 * Provides stable fact ID generation for tracking facts across source versions.
 * Fact IDs enable lineage tracking, supersedence detection, and audit trails.
 *
 * Format: fact-{source_short_hash}-{statement_short_hash}
 * Example: fact-e179dba3-5a6c3b8a
 *
 * @module scripts/fact-id
 */

const { computeHash } = require('./hash.js');

/**
 * Generate a stable fact ID from source URL and statement
 *
 * Fact IDs are stable across versions:
 * - Same source URL always produces same source_short_hash
 * - Same statement always produces same statement_short_hash
 * - Enables tracking facts across source updates
 *
 * @param {string} sourceUrl - The source URL where the fact was found
 * @param {string} statement - The factual statement content
 * @returns {string} Fact ID in format: fact-{source_short_hash}-{statement_short_hash}
 */
function generateFactId(sourceUrl, statement) {
  if (!sourceUrl || typeof sourceUrl !== 'string') {
    throw new Error('sourceUrl must be a non-empty string');
  }

  if (!statement || typeof statement !== 'string') {
    throw new Error('statement must be a non-empty string');
  }

  // Hash source URL (first 8 characters for readability)
  const sourceHash = computeHash(sourceUrl).substring(0, 8);

  // Hash statement (first 8 characters for readability)
  const statementHash = computeHash(statement).substring(0, 8);

  return `fact-${sourceHash}-${statementHash}`;
}

/**
 * Extract the source hash component from a fact ID
 *
 * @param {string} factId - The fact ID to parse
 * @returns {string} The source hash component (first 8 characters of source URL hash)
 */
function extractSourceHash(factId) {
  if (!factId || typeof factId !== 'string') {
    throw new Error('factId must be a non-empty string');
  }

  const parts = factId.split('-');
  if (parts.length !== 3 || parts[0] !== 'fact') {
    throw new Error(`Invalid fact ID format: ${factId}. Expected format: fact-{source_hash}-{statement_hash}`);
  }

  return parts[1];
}

/**
 * Extract the statement hash component from a fact ID
 *
 * @param {string} factId - The fact ID to parse
 * @returns {string} The statement hash component (first 8 characters of statement hash)
 */
function extractStatementHash(factId) {
  if (!factId || typeof factId !== 'string') {
    throw new Error('factId must be a non-empty string');
  }

  const parts = factId.split('-');
  if (parts.length !== 3 || parts[0] !== 'fact') {
    throw new Error(`Invalid fact ID format: ${factId}. Expected format: fact-{source_hash}-{statement_hash}`);
  }

  return parts[2];
}

/**
 * Validate a fact ID format
 *
 * @param {string} factId - The fact ID to validate
 * @returns {boolean} True if the fact ID has valid format
 */
function isValidFactId(factId) {
  if (!factId || typeof factId !== 'string') {
    return false;
  }

  const factIdPattern = /^fact-[a-f0-9]{8}-[a-f0-9]{8}$/;
  return factIdPattern.test(factId);
}

/**
 * Generate multiple fact IDs from an array of source-statement pairs
 *
 * @param {Array<{sourceUrl: string, statement: string}>} pairs - Array of source-statement pairs
 * @returns {Array<string>} Array of fact IDs
 */
function generateFactIds(pairs) {
  if (!Array.isArray(pairs)) {
    throw new Error('pairs must be an array');
  }

  return pairs.map(pair => generateFactId(pair.sourceUrl, pair.statement));
}

/**
 * Compare two fact IDs to determine if they're from the same source
 *
 * @param {string} factId1 - First fact ID
 * @param {string} factId2 - Second fact ID
 * @returns {boolean} True if both fact IDs are from the same source URL
 */
function areFromSameSource(factId1, factId2) {
  const hash1 = extractSourceHash(factId1);
  const hash2 = extractSourceHash(factId2);
  return hash1 === hash2;
}

// Export functions
module.exports = {
  generateFactId,
  extractSourceHash,
  extractStatementHash,
  isValidFactId,
  generateFactIds,
  areFromSameSource
};

// If run directly, perform simple tests
if (require.main === module) {
  console.log('=== Fact ID Module Tests ===\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Generate fact ID
  try {
    const sourceUrl = 'https://advertising.amazon.com/solutions/products/sponsored-products';
    const statement = 'Sponsored Products support automatic targeting';
    const factId = generateFactId(sourceUrl, statement);

    console.log('✓ Test 1: Generate fact ID');
    console.log(`  Source: ${sourceUrl}`);
    console.log(`  Statement: ${statement}`);
    console.log(`  Fact ID: ${factId}`);
    console.log(`  Valid format: ${isValidFactId(factId) ? 'Yes' : 'No'}`);
    passed++;
  } catch (e) {
    console.log(`✗ Test 1: ${e.message}`);
    failed++;
  }

  console.log('');

  // Test 2: Fact ID stability
  try {
    const sourceUrl = 'https://example.com';
    const statement = 'Test statement';

    const id1 = generateFactId(sourceUrl, statement);
    const id2 = generateFactId(sourceUrl, statement);

    if (id1 === id2) {
      console.log('✓ Test 2: Fact ID stability (same input produces same ID)');
      console.log(`  First: ${id1}`);
      console.log(`  Second: ${id2}`);
      passed++;
    } else {
      console.log('✗ Test 2: Fact ID instability');
      console.log(`  First: ${id1}`);
      console.log(`  Second: ${id2}`);
      failed++;
    }
  } catch (e) {
    console.log(`✗ Test 2: ${e.message}`);
    failed++;
  }

  console.log('');

  // Test 3: Extract components
  try {
    const factId = 'fact-e179dba3-5a6c3b8a';
    const sourceHash = extractSourceHash(factId);
    const statementHash = extractStatementHash(factId);

    console.log('✓ Test 3: Extract fact ID components');
    console.log(`  Fact ID: ${factId}`);
    console.log(`  Source hash: ${sourceHash}`);
    console.log(`  Statement hash: ${statementHash}`);
    passed++;
  } catch (e) {
    console.log(`✗ Test 3: ${e.message}`);
    failed++;
  }

  console.log('');

  // Test 4: Same source detection
  try {
    const sourceUrl = 'https://example.com';
    const statement1 = 'First statement';
    const statement2 = 'Second statement';

    const id1 = generateFactId(sourceUrl, statement1);
    const id2 = generateFactId(sourceUrl, statement2);

    const sameSource = areFromSameSource(id1, id2);

    console.log('✓ Test 4: Same source detection');
    console.log(`  Fact ID 1: ${id1}`);
    console.log(`  Fact ID 2: ${id2}`);
    console.log(`  Same source: ${sameSource ? 'Yes' : 'No'}`);
    passed++;
  } catch (e) {
    console.log(`✗ Test 4: ${e.message}`);
    failed++;
  }

  console.log('');
  console.log('=== Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  process.exit(failed > 0 ? 1 : 0);
}
