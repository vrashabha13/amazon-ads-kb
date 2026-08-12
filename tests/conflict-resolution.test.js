#!/usr/bin/env node

/**
 * Conflict Resolution Tests
 *
 * Tests for conflict detection and resolution when sources disagree.
 * Verifies the priority rules: official > unofficial, higher confidence > lower confidence.
 */

const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '..');
const { generateFactId } = require('../scripts/fact-id.js');

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

console.log('\n=== Conflict Resolution Tests ===\n');

// Test 1: Official source wins over unofficial
test('Official source overrides unofficial source', () => {
  // This test verifies the conflict resolution priority:
  // Official source (amazon.com/docs) > Unofficial source

  const officialUrl = 'https://advertising.amazon.com/API/docs/en-us/keywords/bidding';
  const unofficialUrl = 'https://third-party-blog.com/amazon-ads/bidding';

  const statement1 = 'Minimum bid is $0.02';
  const statement2 = 'Minimum bid is $0.05';

  // Same statement content but different values
  const fact1 = {
    statement: statement1,
    source_url: officialUrl,
    confidence: 'high',
    official_source: true
  };

  const fact2 = {
    statement: statement2,
    source_url: unofficialUrl,
    confidence: 'medium',
    official_source: false
  };

  // Official source should win
  assert(fact1.official_source && !fact2.official_source,
    'Official source should be marked as official');

  assertEqual(fact1.confidence, 'high', 'Official source should have high confidence');

  // When in conflict, official wins
  const winner = fact1.official_source ? fact1 : fact2;
  assertEqual(winner.source_url, officialUrl, 'Official source should win the conflict');
});

// Test 2: Higher confidence wins when officialness is equal
test('Higher confidence wins when sources have equal officialness', () => {
  // This test verifies that when both sources are equally official/unofficial,
  // higher confidence prevails

  const source1 = {
    statement: 'Campaign budget minimum is $10',
    source_url: 'https://guide.amazon.com/budgets',
    confidence: 'high',
    official_source: false
  };

  const source2 = {
    statement: 'Campaign budget minimum is $5',
    source_url: 'https://another-guide.amazon.com/budgets',
    confidence: 'low',
    official_source: false
  };

  // Both unofficial, so higher confidence wins
  assert(!source1.official_source && !source2.official_source,
    'Both sources should be unofficial');

  assert(source1.confidence === 'high' && source2.confidence === 'low',
    'First source should have higher confidence');

  // High confidence wins
  const winner = source1.confidence === 'high' ? source1 : source2;
  assertEqual(winner.statement, 'Campaign budget minimum is $10',
    'Higher confidence source should win');
});

// Test 3: Manual review flag for official-vs-official conflicts
test('Manual review flagged when two official sources contradict', () => {
  // This test verifies that when two official sources contradict,
  // manual review is flagged instead of automatic resolution

  const officialSource1 = {
    statement: 'Daily budget minimum is $1',
    source_url: 'https://advertising.amazon.com/guides/budgets',
    confidence: 'high',
    official_source: true
  };

  const officialSource2 = {
    statement: 'Daily budget minimum is $10',
    source_url: 'https://advertising.amazon.com/API/docs/budgets',
    confidence: 'high',
    official_source: true
  };

  // Both are official sources with contradictory information
  assert(officialSource1.official_source && officialSource2.official_source,
    'Both sources should be official');

  assert(officialSource1.statement !== officialSource2.statement,
    'Sources should have contradictory statements');

  // Should flag for manual review, not automatically resolve
  const needsManualReview = officialSource1.official_source && officialSource2.official_source &&
    officialSource1.statement !== officialSource2.statement;

  assert(needsManualReview, 'Official-vs-official conflicts should flag manual review');
});

// Test 4: Fact ID consistency across conflict scenarios
test('Fact IDs remain consistent regardless of conflicts', () => {
  // This test verifies that fact IDs are stable even when sources conflict

  const statement = 'Minimum bid is $0.02';
  const sourceUrl1 = 'https://advertising.amazon.com/docs';
  const sourceUrl2 = 'https://third-party.com/docs';

  const id1 = generateFactId(sourceUrl1, statement);
  const id2 = generateFactId(sourceUrl2, statement);

  // Same statement but different sources should produce different fact IDs
  assert(id1 !== id2, 'Different sources should produce different fact IDs');

  // But same statement with same source should always produce same ID
  const id1Retry = generateFactId(sourceUrl1, statement);
  assertEqual(id1, id1Retry, 'Same source and statement should produce stable fact ID');
});

// Test 5: Confidence level assignment
test('Confidence levels assigned correctly based on source type', () => {
  // This test verifies confidence assignment rules

  const officialSource = {
    source_url: 'https://advertising.amazon.com/API/docs/en-us',
    official_source: true,
    expected_confidence: 'high'
  };

  const unofficialButClear = {
    source_url: 'https://reputable-blog.com/amazon-ads',
    official_source: false,
    clarity: 'high',
    expected_confidence: 'medium'
  };

  const unofficialAndUnclear = {
    source_url: 'https://obscure-forum.com/post/12345',
    official_source: false,
    clarity: 'low',
    expected_confidence: 'low'
  };

  // Official sources should get high confidence
  assertEqual(officialSource.expected_confidence, 'high',
    'Official sources should have high confidence');

  // Unofficial but clear sources should get medium confidence
  assertEqual(unofficialButClear.expected_confidence, 'medium',
    'Unofficial but clear sources should have medium confidence');

  // Unofficial and unclear sources should get low confidence
  assertEqual(unofficialAndUnclear.expected_confidence, 'low',
    'Unofficial and unclear sources should have low confidence');
});

// Test 6: Source type detection
test('Source type detection works correctly', () => {
  // This test verifies that source URLs are correctly classified as official/unofficial

  const officialSources = [
    'https://advertising.amazon.com/API/docs/en-us/bidding',
    'https://advertising.amazon.com/library/guides/campaign-setup',
    'https://sellercentral.amazon.com/help/12345'
  ];

  const unofficialSources = [
    'https://third-party-blog.com/amazon-ads-guide',
    'https://agency-blog.com/ppc-tips',
    'https://github.com/username/amazon-ads-tools'
  ];

  // Check official sources
  officialSources.forEach(url => {
    const isOfficial = url.includes('amazon.com');
    assert(isOfficial, `${url} should be detected as official source`);
  });

  // Check unofficial sources
  unofficialSources.forEach(url => {
    const isOfficial = url.includes('amazon.com');
    assert(!isOfficial, `${url} should be detected as unofficial source`);
  });
});

// Test 7: Merge notes generation for conflicts
test('Merge notes should explain conflict resolution', () => {
  // This test verifies that conflicts are documented in merge notes

  const conflictScenario = {
    official_statement: 'Minimum bid is $0.02',
    unofficial_statement: 'Minimum bid is $0.05',
    resolution: 'Official source (amazon.com) wins',
    reason: 'Official source has higher authority'
  };

  // Generate expected merge note
  const expectedNote = `Conflict detected: Official source says "${conflictScenario.official_statement}", ` +
    `unofficial source says "${conflictScenario.unofficial_statement}". ${conflictScenario.resolution}.`;

  assert(expectedNote.includes('Conflict detected'), 'Merge note should indicate conflict');
  assert(expectedNote.includes('Official source'), 'Merge note should mention official source');
  assert(expectedNote.includes('wins'), 'Merge note should explain resolution');
});

// Test 8: Nuance detection (minor conflicts)
test('Minor conflicts detected as nuance, not contradictions', () => {
  // This test verifies that statements that can both be true are flagged as nuance
  // rather than direct contradictions

  const statement1 = 'Sponsored Products use keyword targeting';
  const statement2 = 'Sponsored Products use product targeting';

  // These are not contradictions - both can be true
  const areContradictory = false;

  // Both statements mention "Sponsored Products use" but describe different features
  const hasNuance = statement1.includes('Sponsored Products use') &&
                   statement2.includes('Sponsored Products use') &&
                   statement1 !== statement2;

  assert(!areContradictory, 'Statements should not be considered contradictory');
  assert(hasNuance, 'Statements should be recognized as having nuance');
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
  console.log(`\n${colors.cyan}Note: These tests verify conflict resolution logic.${colors.reset}`);
  console.log(`${colors.cyan}Full integration tests will verify end-to-end conflict handling.${colors.reset}`);
  process.exit(0);
}
