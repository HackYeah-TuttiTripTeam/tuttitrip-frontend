---
name: open-pr
description: Open a pull request for tuttitrip-frontend with a structured Polish/English description, screenshots and a change list, after running the verify workflow. Use when the user asks to open, create or prepare a PR.
---

# Open PR

1. **Branch check.** Never commit to `main` or `develop` directly. Feature work lives on
   `feature/<short-description>`, based on `develop`. Releases are PRs `develop` -> `main`.
2. **Verify.** `pnpm biome check --write . && pnpm tsc -b && pnpm test:arch && pnpm build`.
   Fix everything; do not skip hooks or disable rules to get green.
3. **Contract.** If the backend changed, `pnpm api:sync --url <backend>/openapi.json` and commit
   `src/api/schema.d.ts` in the same PR.
4. **UI changes** need the `impeccable-review` skill and screenshots (desktop 1280px and mobile
   390px). Upload them by dragging into the PR on GitHub, or link the preview URL the CI bot posts.
5. **Commit** with an imperative English subject (<= 72 chars) and a body explaining why.
   No AI attribution: no `Co-Authored-By` lines for tools, no "Generated with" text.
6. **Push and open** the PR into `develop`:

```bash
git push -u origin HEAD
gh pr create --base develop --title "<what changes, imperative>" --body-file /tmp/pr.md
```

Body template (`/tmp/pr.md`):

```markdown
## Co i dlaczego
<one paragraph: the problem and the approach>

## Zmiany
- <change 1>
- <change 2>

## Jak przetestować
1. <steps, including URL params to try, e.g. /trips?sort=name&dir=asc>

## Zrzuty ekranu
| Desktop | Mobile |
| --- | --- |
| <img> | <img> |

## Checklist
- [ ] `pnpm verify` passes, CI green
- [ ] impeccable-review done (UI changes)
- [ ] API contract synced (if the backend changed)
```

7. Wait for the CI bot's preview comment and check the preview on a phone.
   After merge the branch is deleted, which also deletes its preview Worker.
