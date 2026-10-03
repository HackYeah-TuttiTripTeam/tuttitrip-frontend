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
gh pr create --base develop --title "feat(frontend): <opis>" --body-file /tmp/pr.md
```

PR title: `feat:`, `docs:`, `chore:` or `bugfix:` (not `bug:`, that prefix is
for issues), optionally with a scope, then a Polish description, e.g.
`feat(frontend): Filtrowanie wyjazdów po dacie`. A release PR `develop` -> `main`
is titled `release: <opis>`. The `PR format` check enforces this and the
template sections below; a red check does not block the merge button, so
fix it before merging.

Body template (`/tmp/pr.md`):

```markdown
## Co i dlaczego
<1-3 zdania: co zmienia PR i po co>

## Powiązane issue
Closes #<numer>

## Lista zmian
- <zmiana>

## Jak przetestować
1. <kroki, także parametry URL do sprawdzenia, np. /trips?sort=name&dir=asc>
2. Podgląd z komentarza bota CI

## Zrzuty ekranu
| Desktop | Telefon |
| --- | --- |
| <img> | <img> |

(bez zmian w UI: nie dotyczy)

## Checklista
- [ ] `pnpm verify` przechodzi, CI zielone
- [ ] testy dla nowej logiki
- [ ] impeccable-review zrobione (zmiany w UI)
- [ ] kontrakt API zsynchronizowany (jeśli zmienił się backend)
- [ ] docs / AGENTS.md zaktualizowane, jeśli trzeba
- [ ] brak sekretów w kodzie, logach i opisie
```

7. Wait for the CI bot's preview comment and check the preview on a phone.
   After merge the `Delete merged branch` workflow deletes the branch and
   starts `frontend-cleanup.yml`, which deletes its preview Worker. It never
   deletes `main` or `develop`, so a release PR goes straight from `develop`;
   do not pass `--delete-branch` to `gh pr merge` for a release PR.
8. Merge into `develop` with "Squash and merge" (the PR title becomes the
   commit). Merge a release PR into `main` with "Create a merge commit".
   Release notes need no extra work: the `Release notes` workflow labels the PR
   `type:*` from its title, adds it to the draft release on merge into
   `develop` and publishes the draft with a tag when the release PR lands on
   `main`. Rules: https://github.com/HackYeah-TuttiTripTeam/.github/blob/main/CONTRIBUTING.md
