#!/bin/bash

# Test OKF Frontmatter Validation Hook Integration
# This script verifies the hook is properly connected and working

set -e

echo "🧪 Testing OKF Frontmatter Validation Hook Integration"
echo "========================================================"
echo ""

# Test 1: Verify hook is executable
echo "Test 1: Verify hook file exists and is executable..."
if [ -x ".claude/hooks/validate-okf-frontmatter.js" ]; then
    echo "✅ Hook file is executable"
else
    echo "❌ Hook file is not executable"
    exit 1
fi
echo ""

# Test 2: Verify hook is registered in settings.json
echo "Test 2: Verify hook is registered in settings.json..."
if grep -q '"PreToolUse"' .claude/settings.json && grep -q 'validate-okf-frontmatter.js' .claude/settings.json; then
    echo "✅ Hook is registered in settings.json"
else
    echo "❌ Hook is not registered in settings.json"
    exit 1
fi
echo ""

# Test 3: Hook blocks invalid document (missing fields)
echo "Test 3: Hook blocks invalid document..."
INVALID_INPUT=$(cat <<EOF
{"tool":"Write","filePath":"$(pwd)/knowledge/concepts/invalid-test.okf.md","content":"---\ntype: concept\n---\n\nTest"}
EOF
)

if echo "$INVALID_INPUT" | node .claude/hooks/validate-okf-frontmatter.js > /dev/null 2>&1; then
    echo "❌ Hook allowed invalid document (should have blocked)"
    exit 1
else
    echo "✅ Hook correctly blocked invalid document"
fi
echo ""

# Test 4: Hook allows valid document
echo "Test 4: Hook allows valid document..."
VALID_INPUT=$(cat <<EOF
{"tool":"Write","filePath":"$(pwd)/knowledge/concepts/valid-test.okf.md","content":"---\ntype: concept\ntitle: Test\ndescription: Test\nresource: https://example.com\ntags:\n  - test\ntimestamp: 2026-08-11T00:00:00Z\nlast_checked: 2026-08-11T00:00:00Z\nconfidence: high\nsources_count: 1\nofficial_source: true\n---\n\nTest"}
EOF
)

if echo "$VALID_INPUT" | node .claude/hooks/validate-okf-frontmatter.js > /dev/null 2>&1; then
    echo "✅ Hook correctly allowed valid document"
else
    echo "❌ Hook blocked valid document (should have allowed)"
    exit 1
fi
echo ""

# Test 5: Hook ignores non-knowledge files
echo "Test 5: Hook ignores non-knowledge files..."
NON_KNOWLEDGE_INPUT=$(cat <<EOF
{"tool":"Write","filePath":"$(pwd)/README.md","content":"# README\n\nThis is a readme"}
EOF
)

if echo "$NON_KNOWLEDGE_INPUT" | node .claude/hooks/validate-okf-frontmatter.js > /dev/null 2>&1; then
    echo "✅ Hook correctly ignored non-knowledge file"
else
    echo "❌ Hook incorrectly blocked non-knowledge file"
    exit 1
fi
echo ""

# Test 6: Hook ignores non-markdown files
echo "Test 6: Hook ignores non-markdown files..."
NON_MARKDOWN_INPUT=$(cat <<EOF
{"tool":"Write","filePath":"$(pwd)/knowledge/.manifest.json","content":"{}"}
EOF
)

if echo "$NON_MARKDOWN_INPUT" | node .claude/hooks/validate-okf-frontmatter.js > /dev/null 2>&1; then
    echo "✅ Hook correctly ignored non-markdown file"
else
    echo "❌ Hook incorrectly blocked non-markdown file"
    exit 1
fi
echo ""

echo "========================================================"
echo "✅ All hook integration tests passed!"
echo ""
echo "Summary:"
echo "  - Hook file exists and is executable"
echo "  - Hook is registered in settings.json"
echo "  - Hook blocks invalid OKF documents"
echo "  - Hook allows valid OKF documents"
echo "  - Hook ignores non-knowledge files"
echo "  - Hook ignores non-markdown files"
echo ""
echo "The validation hook is properly connected and operational!"