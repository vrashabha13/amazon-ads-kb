/**
 * OKF Frontmatter Validation Utility
 *
 * Provides reusable validation functions for:
 * - Agents (Publisher, Extractor, Merger)
 * - Tests (knowledge-quality.test.js)
 * - Hook (validate-okf-frontmatter.js)
 *
 * This is the single source of truth for OKF frontmatter validation.
 */

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
  // Only validate .md files in knowledge/ directory
  if (!filePath.endsWith('.md')) {
    return { valid: true, reason: 'Not a Markdown file' };
  }

  if (!filePath.includes('knowledge/')) {
    return { valid: true, reason: 'Not in knowledge/ directory' };
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

module.exports = {
  validateOKFFrontmatter,
  REQUIRED_FIELDS
};