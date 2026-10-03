#!/usr/bin/env bash
# Creates or updates the single preview comment on a PR (no comment spam).
#   GH_TOKEN=... scripts/pr-comment.sh <pr-number> <body-file> [--update-only]
# The comment is found by the marker <!-- tuttitrip-preview --> in its body.
set -euo pipefail
pr="$1"
body_file="$2"
update_only="${3:-}"
marker='<!-- tuttitrip-preview -->'
repo="${GITHUB_REPOSITORY:?missing}"

body="$marker"$'\n'"$(cat "$body_file")"
id=$(gh api "repos/$repo/issues/$pr/comments" --paginate \
  --jq ".[] | select(.body | startswith(\"$marker\")) | .id" | head -n1)

if [ -n "$id" ]; then
  gh api -X PATCH "repos/$repo/issues/comments/$id" -f body="$body" --silent
elif [ "$update_only" != "--update-only" ]; then
  gh api -X POST "repos/$repo/issues/$pr/comments" -f body="$body" --silent
fi
