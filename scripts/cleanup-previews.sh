#!/usr/bin/env bash
# Deletes preview Workers (tuttitrip-preview-<slug>) whose branch no longer exists.
# Never touches anything else: only Worker names matching ^tuttitrip-preview-[a-z0-9-]+$
# are considered, so tuttitrip-frontend (main) and tuttitrip-frontend-develop are safe.
#
#   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... scripts/cleanup-previews.sh [--dry-run]
#
# Prints the deleted Worker names, one per line, on stdout.
set -euo pipefail

dry_run=false
[ "${1:-}" = "--dry-run" ] && dry_run=true

: "${CLOUDFLARE_API_TOKEN:?missing}" "${CLOUDFLARE_ACCOUNT_ID:?missing}"
api="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts"
here=$(dirname "$0")

workers=$(curl -fsS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$api" |
  jq -r '.result[].id | select(test("^tuttitrip-preview-[a-z0-9-]+$"))')

# Slugs of every branch that still exists on GitHub.
mapfile -t live < <(git ls-remote --heads origin | sed 's#.*refs/heads/##' |
  while read -r branch; do "$here/slugify.sh" "$branch"; done)

for worker in $workers; do
  slug=${worker#tuttitrip-preview-}
  if printf '%s\n' "${live[@]}" | grep -qxF "$slug"; then continue; fi
  echo "cleanup-previews: $worker has no branch, deleting" >&2
  if [ "$dry_run" = false ]; then
    curl -fsS -X DELETE -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      "$api/$worker?force=true" >/dev/null
  fi
  echo "$worker"
done
