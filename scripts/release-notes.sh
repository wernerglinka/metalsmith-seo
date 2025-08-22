#!/bin/bash

# Generate release notes for the current version only
# Usage: ./scripts/release-notes.sh <previous-tag>

set -e

PREV_TAG="${1:-$(git describe --tags --abbrev=0 HEAD^)}"
REPO_URL="https://github.com/wernerglinka/metalsmith-seo"

# Get commits since the previous tag, excluding merge commits and chore commits
echo "## Changes"
echo ""

git log --pretty=format:"- %s ([%h]($REPO_URL/commit/%H))" \
  "${PREV_TAG}..HEAD" \
  --no-merges \
  --grep="^chore:" --grep="^ci:" --grep="^dev:" --invert-grep

echo ""
echo ""
echo "**Full Changelog**: [$PREV_TAG...$(git describe --tags --exact-match HEAD)](${REPO_URL}/compare/${PREV_TAG}...$(git describe --tags --exact-match HEAD))"