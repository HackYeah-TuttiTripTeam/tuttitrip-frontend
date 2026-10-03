#!/usr/bin/env bash
# Branch -> backend API mapping (see AGENTS.md, "Branch -> API").
#
#   scripts/resolve-api.sh <frontend-branch>
#
# Picks the backend deployment for the same branch name, falling back to the
# nearest "higher" branch: feature/x -> develop -> main. A candidate counts only
# if its /api/v1/openapi.json answers: a deployment still on the old unversioned
# paths cannot serve this client, so it is skipped. main always maps to production.
#
# Prints KEY=VALUE lines (append them to $GITHUB_OUTPUT in CI):
#   api_url     backend origin: the preview Worker proxies /api/* to it (API_ORIGIN)
#   api_schema_url  its OpenAPI document (api:sync)
#   api_branch  backend branch that was picked (main, develop or the branch)
#   api_live    true if that deployment answered, false if nothing did and
#               api_url is only the expected URL (keep the committed schema)
#   app_env     frontend environment label: main, develop or the branch slug
#   preview_worker Worker name for this branch's preview: tuttitrip-preview-<slug>
#
# Optional: BACKEND_REPO_TOKEN (a token that can read the backend repo) adds a
# check that the backend branch exists before probing its deployment.
set -euo pipefail

branch="${1:?usage: resolve-api.sh <branch>}"
domain="${TT_DOMAIN:-gburek.app}"
backend_repo="${BACKEND_REPO:-HackYeah-TuttiTripTeam/tuttitrip-backend}"
openapi_path=/api/v1/openapi.json

here=$(dirname "$0")
# Backend hostnames: "tuttitrip-api-" + slug must fit a 63-char DNS label (49).
slugify() { "$here/slugify.sh" "$1" "$2"; }

api_host() {
  case "$1" in
    main) printf 'tuttitrip-api.%s' "$domain" ;;
    *) printf 'tuttitrip-api-%s.%s' "$1" "$domain" ;;
  esac
}

backend_branch_exists() {
  [ -z "${BACKEND_REPO_TOKEN:-}" ] && return 0 # cannot check, rely on the probe
  curl -fsS -o /dev/null -H "Authorization: Bearer $BACKEND_REPO_TOKEN" \
    "https://api.github.com/repos/$backend_repo/branches/$1" 2>/dev/null
}

is_live() {
  curl -fsS -o /dev/null --max-time 10 --retry 2 --retry-delay 2 "https://$(api_host "$1")$openapi_path"
}

case "$branch" in
  main) env_label=main; candidates=(main) ;;
  develop) env_label=develop; candidates=(develop main) ;;
  *) env_label=$(slugify "$branch" 49); candidates=("$branch" develop main) ;;
esac

picked=""
for candidate in "${candidates[@]}"; do
  label=$candidate
  [ "$candidate" != main ] && [ "$candidate" != develop ] && label=$(slugify "$candidate" 49)
  if backend_branch_exists "$candidate" && is_live "$label"; then
    picked=$label
    break
  fi
  echo "resolve-api: backend '$candidate' not available, trying the next one" >&2
done

live=true
if [ -z "$picked" ]; then
  # Nothing answers yet (e.g. backend not deployed): build against the URL this
  # branch should talk to and keep the committed schema.
  live=false
  case "$branch" in main) picked=main ;; *) picked=develop ;; esac
fi

echo "api_url=https://$(api_host "$picked")"
echo "api_schema_url=https://$(api_host "$picked")$openapi_path"
echo "api_branch=$picked"
echo "api_live=$live"
echo "app_env=$env_label"
# Worker name = preview hostname label: "tuttitrip-preview-" + 45 = 63 chars.
echo "preview_worker=tuttitrip-preview-$(slugify "$branch" 45)"
