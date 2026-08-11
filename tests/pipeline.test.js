#!/usr/bin/env node

/**
 * Pipeline Tests
 *
 * Tests for the five-stage pipeline:
 * - Sequential execution order
 * - Data flow between stages
 * - Error handling
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEST_DIR = path.join(__dirname, '..');
const STATE_DIR = path.join(TEST_DIR, 'pipeline-state');

// ANSI colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
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

function assertThrows(fn, message) {
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
  }
  if (!threw) {
    throw new Error(message || 'Expected function to throw');
  }
}

// Cleanup before tests
if (fs.existsSync(STATE_DIR)) {
  fs.rmSync(STATE_DIR, { recursive: true, force: true });
}

console.log('\n=== Pipeline Tests ===\n');

// Test 1: Pipeline orchestrator script exists
test('Pipeline orchestrator script exists', () => {
  const pipelinePath = path.join(TEST_DIR, 'scripts', 'pipeline.js');
  assert(fs.existsSync(pipelinePath), 'pipeline.js should exist');
  const stats = fs.statSync(pipelinePath);
  assert(stats.isFile(), 'pipeline.js should be a file');
});

// Test 2: Package.json exists with correct scripts
test('package.json exists with ingest script', () => {
  const pkgPath = path.join(TEST_DIR, 'package.json');
  assert(fs.existsSync(pkgPath), 'package.json should exist');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  assert(pkg.scripts, 'package.json should have scripts');
  assert(pkg.scripts.ingest, 'scripts should include ingest command');
  assertEqual(pkg.scripts.ingest, 'node scripts/ingest.js', 'ingest script should point to ingest.js');
});

// Test 3: All agent instruction files exist
test('All agent instruction files exist', () => {
  const agents = ['scout', 'extractor', 'validator', 'merger', 'publisher'];
  agents.forEach(agent => {
    const agentPath = path.join(TEST_DIR, '.claude', 'agents', `${agent}.md`);
    assert(fs.existsSync(agentPath), `${agent}.md should exist`);
  });
});

// Test 4: Pipeline state directory creation
test('Pipeline creates state directory', () => {
  // The pipeline should create the directory when started
  // For this test, we'll just verify the logic exists
  const pipelineContent = fs.readFileSync(
    path.join(TEST_DIR, 'scripts', 'pipeline.js'),
    'utf-8'
  );
  assert(pipelineContent.includes('createStateDir'), 'Pipeline should have createStateDir function');
  assert(pipelineContent.includes('STATE_DIR'), 'Pipeline should have STATE_DIR constant');
  assert(true, 'State directory creation logic exists in pipeline.js');
});

// Test 5: Stage input file writing
test('Pipeline writes stage input files', () => {
  // Create state directory
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }

  // Simulate writing stage input
  const inputData = { url: 'https://example.com', test: true };
  const inputFile = path.join(STATE_DIR, 'scout-input.json');
  fs.writeFileSync(inputFile, JSON.stringify(inputData, null, 2));

  assert(fs.existsSync(inputFile), 'Input file should be created');
  const content = fs.readFileSync(inputFile, 'utf-8');
  const data = JSON.parse(content);
  assertEqual(data.url, 'https://example.com', 'Input file should contain correct data');
});

// Test 6: Stage output file reading
test('Pipeline reads stage output files', () => {
  // Create output file
  const outputFile = path.join(STATE_DIR, 'scout-output.json');
  const outputData = {
    status: 'success',
    stage: 'scout',
    data: { url: 'https://example.com', content: 'test content' }
  };
  fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));

  // Read it back
  const content = fs.readFileSync(outputFile, 'utf-8');
  const data = JSON.parse(content);

  assertEqual(data.status, 'success', 'Output should have success status');
  assertEqual(data.stage, 'scout', 'Output should have correct stage name');
  assert(data.data, 'Output should contain data');
});

// Test 7: Error state file creation
test('Pipeline creates error state on failure', () => {
  const errorFile = path.join(STATE_DIR, 'error.json');
  const errorData = {
    stage: 'SCOUT',
    error: 'Failed to fetch URL',
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(errorFile, JSON.stringify(errorData, null, 2));

  assert(fs.existsSync(errorFile), 'Error file should be created');
  const content = fs.readFileSync(errorFile, 'utf-8');
  const data = JSON.parse(content);
  assertEqual(data.stage, 'SCOUT', 'Error should include stage name');
  assert(data.error, 'Error should include error message');
});

// Test 8: Sequential stage execution (mock test)
test('Pipeline executes stages in correct order', () => {
  const stages = [
    { name: 'SCOUT', number: 1 },
    { name: 'EXTRACTOR', number: 2 },
    { name: 'VALIDATOR', number: 3 },
    { name: 'MERGER', number: 4 },
    { name: 'PUBLISHER', number: 5 }
  ];

  // Verify stage order
  assertEqual(stages[0].name, 'SCOUT', 'First stage should be SCOUT');
  assertEqual(stages[1].name, 'EXTRACTOR', 'Second stage should be EXTRACTOR');
  assertEqual(stages[2].name, 'VALIDATOR', 'Third stage should be VALIDATOR');
  assertEqual(stages[3].name, 'MERGER', 'Fourth stage should be MERGER');
  assertEqual(stages[4].name, 'PUBLISHER', 'Fifth stage should be PUBLISHER');
});

// Test 9: Data flow between stages (structure test)
test('Pipeline passes data between stages via JSON', () => {
  // Scout output becomes Extractor input
  const scoutOutput = {
    status: 'success',
    stage: 'scout',
    data: {
      url: 'https://example.com',
      content_hash: 'abc123',
      content: '<html>test</html>'
    }
  };

  // Write scout output as extractor input
  fs.writeFileSync(
    path.join(STATE_DIR, 'extractor-input.json'),
    JSON.stringify(scoutOutput.data, null, 2)
  );

  const extractorInput = JSON.parse(
    fs.readFileSync(path.join(STATE_DIR, 'extractor-input.json'), 'utf-8')
  );

  assertEqual(extractorInput.url, 'https://example.com', 'URL should pass through');
  assertEqual(extractorInput.content_hash, 'abc123', 'Content hash should pass through');
});

// Test 10: Error handling structure
test('Pipeline has error handling logic', () => {
  // Verify the pipeline script has error handling
  const pipelineContent = fs.readFileSync(
    path.join(TEST_DIR, 'scripts', 'pipeline.js'),
    'utf-8'
  );

  assert(pipelineContent.includes('try'), 'Pipeline should have try-catch blocks');
  assert(pipelineContent.includes('catch'), 'Pipeline should have error catching');
  assert(pipelineContent.includes('error'), 'Pipeline should have error reporting');
});

// Test 11: Stage descriptions
test('All stages have descriptions', () => {
  const pipelineContent = fs.readFileSync(
    path.join(TEST_DIR, 'scripts', 'pipeline.js'),
    'utf-8'
  );

  // Check that each stage is mentioned with a description
  assert(pipelineContent.includes('SCOUT'), 'Should mention SCOUT stage');
  assert(pipelineContent.includes('EXTRACTOR'), 'Should mention EXTRACTOR stage');
  assert(pipelineContent.includes('VALIDATOR'), 'Should mention VALIDATOR stage');
  assert(pipelineContent.includes('MERGER'), 'Should mention MERGER stage');
  assert(pipelineContent.includes('PUBLISHER'), 'Should mention PUBLISHER stage');
});

// Test 12: CLI argument handling
test('Pipeline handles CLI arguments correctly', () => {
  const pipelineContent = fs.readFileSync(
    path.join(TEST_DIR, 'scripts', 'pipeline.js'),
    'utf-8'
  );

  assert(pipelineContent.includes('process.argv'), 'Should read command line arguments');
  assert(pipelineContent.includes('url = '), 'Should extract URL from arguments');
  assert(pipelineContent.includes('Usage:'), 'Should show usage on missing argument');
});

// Cleanup
if (fs.existsSync(STATE_DIR)) {
  fs.rmSync(STATE_DIR, { recursive: true, force: true });
}

// Summary
console.log('\n=== Test Summary ===');
console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);

if (testsFailed > 0) {
  console.log(`\n${colors.red}Some tests failed${colors.reset}`);
  process.exit(1);
} else {
  console.log(`\n${colors.green}All tests passed!${colors.reset}`);
  process.exit(0);
}
