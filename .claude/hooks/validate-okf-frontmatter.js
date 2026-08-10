/**
 * OKF Frontmatter Validation Hook
 *
 * This hook BLOCKS writes to knowledge/ if required frontmatter fields are missing.
 * Triggered before any Write tool call that creates/modifies files under knowledge/
 */

const path = require('path');

// Required fields from OKF v0.1 spec
const REQUIRED_FIELDS = [
  'type',
  'title',
  'description',
  'resource',
  'tags',
  'timestamp'
];

// Project-specific required fields
const PROJECT_REQUIRED_FIELDS = [
  'confidence',
  'sources_count',
  'official_source',
  'last_checked'
];

function validateOKFFrontmatter(fileContent, filePath) {
  // Only validate files in knowledge/ directory
  if (!filePath.includes('knowledge/')) {
    return { valid: true };
  }

  // Only validate .md files
  if (!filePath.endsWith('.md')) {
    return { valid: true };
  }

  // Extract frontmatter (between --- markers)
  const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    return {
      valid: false,
      error: 'No frontmatter found. OKF documents must have YAML frontmatter between --- markers.',
      missing_fields: REQUIRED_FIELDS.concat(PROJECT_REQUIRED_FIELDS)
    };
  }

  const frontmatterText = frontmatterMatch[1];
  const presentFields = [];
  const missingFields = [];

  // Check each required field
  const allRequired = REQUIRED_FIELDS.concat(PROJECT_REQUIRED_FIELDS);

  for (const field of allRequired) {
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

module.exports = { validateOKFFrontmatter };
