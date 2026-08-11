#!/usr/bin/env node

/**
 * OKF Frontmatter Validation Hook
 *
 * This hook BLOCKS writes to knowledge/ if required OKF frontmatter fields are missing.
 * Triggered by Claude Code PreToolUse event before Write tool execution.
 *
 * Usage: Invoked automatically by Claude Code via settings.json hook configuration
 * Input: JSON via stdin from Claude Code
 * Output: JSON response via stdout
 * Exit: 0 (success) or 1 (failure)
 */

const path = require('path');
const fs = require('fs');

// Canonical required fields from OKF v0.1 spec + project extensions
const REQUIRED_FIELDS = [
  'type',
  'title',
  'description',
  'resource',
  'tags',
  'timestamp',
  'confidence',
  'sources_count',
  'official_source',
  'last_checked'
];

/**
 * Validate OKF frontmatter in content
 *
 * @param {string} content - Document content with frontmatter
 * @param {string} filePath - Path to file being validated
 * @returns {object} Validation result with valid, error, and missing_fields
 */
function validateOKFFrontmatter(content, filePath) {
  // Only validate .md files
  if (!filePath.endsWith('.md')) {
    return { valid: true, reason: 'Not a Markdown file' };
  }

  // Extract frontmatter (between --- markers)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    return {
      valid: false,
      error: 'No frontmatter found. OKF documents must have YAML frontmatter between --- markers.',
      missing_fields: REQUIRED_FIELDS
    };
  }

  const frontmatterText = frontmatterMatch[1];
  const presentFields = [];
  const missingFields = [];

  // Check each required field
  for (const field of REQUIRED_FIELDS) {
    // Check if field exists in frontmatter (case-insensitive)
    const fieldRegex = new RegExp(`^${field}:\\s*.+$`, 'm');
    if (fieldRegex.test(frontmatterText)) {
      presentFields.push(field);
    } else {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required frontmatter fields: ${missingFields.join(', ')}`,
      missing_fields: missingFields,
      present_fields: presentFields
    };
  }

  return {
    valid: true,
    present_fields: presentFields
  };
}

/**
 * Main hook execution
 */
function main() {
  let input = '';

  // Read JSON input from Claude Code stdin
  try {
    input = fs.readFileSync(0, 'utf8');
  } catch (e) {
    // No input, this is likely not a hook invocation
    // Export function for direct testing
    module.exports = { validateOKFFrontmatter };
    return;
  }

  let inputData;
  try {
    inputData = JSON.parse(input);
  } catch (e) {
    // Invalid JSON
    console.log(JSON.stringify({
      valid: false,
      error: 'Invalid JSON input from Claude Code'
    }));
    process.exit(1);
  }

  // Validate the write operation
  const { tool, filePath, content } = inputData;

  // Only process Write tools
  if (tool !== 'Write') {
    console.log(JSON.stringify({
      valid: true,
      reason: 'Not a Write operation'
    }));
    process.exit(0);
  }

  // Only validate files in knowledge/concepts/ directory
  if (!filePath.includes('knowledge/')) {
    console.log(JSON.stringify({
      valid: true,
      reason: 'Not in knowledge/ directory'
    }));
    process.exit(0);
  }

  // Only validate .md files (OKF documents)
  if (!filePath.endsWith('.md')) {
    console.log(JSON.stringify({
      valid: true,
      reason: 'Not a Markdown file'
    }));
    process.exit(0);
  }

  // Validate the frontmatter
  const validationResult = validateOKFFrontmatter(content, filePath);

  // Return validation result
  console.log(JSON.stringify(validationResult));

  // Exit with appropriate code
  if (validationResult.valid) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Run main if executed directly
if (require.main === module) {
  main();
}
