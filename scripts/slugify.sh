#!/usr/bin/env bash
# Branch slug, same rules as the backend's deploy/lib.sh (tt_slugify):
# lowercase, runs of [^a-z0-9] -> "-", trimmed, cut to <max> chars.
#   scripts/slugify.sh <branch> [max]
set -euo pipefail
max="${2:-45}"
s=$(printf '%s' "$1" | LC_ALL=C tr '[:upper:]' '[:lower:]' |
  LC_ALL=C sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')
s=${s:0:$max}
printf '%s\n' "${s%-}"
