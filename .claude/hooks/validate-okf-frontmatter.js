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
 *
 * Uses shared validation utility for consistency with agents.
 */

const fs = require('fs');

// Import shared validation utility
const { validateOKFFrontmatter, REQUIRED_FIELDS } = require('../utils/validate-okf.js');

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
    // Export shared utility for direct testing
    module.exports = { validateOKFFrontmatter, REQUIRED_FIELDS };
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

  // Validate the frontmatter using shared utility
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
