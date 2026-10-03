---
name: impeccable-review
description: Audit TuttiTrip UI for AI slop, contrast, visual hierarchy, states and mobile ergonomics by delegating to the impeccable skill, then fix what it finds. Use after generating or changing any UI in tuttitrip-frontend, before opening a PR.
---

# Impeccable review

A wrapper that runs the `impeccable` skill with this project's rules. Requires the
impeccable skill to be installed for the agent (`npx impeccable` / skills registry).

## Steps

1. Invoke the `impeccable` skill with `audit <changed views/components>`. It reads `PRODUCT.md`
   and `DESIGN.md` in the repo root. Then run its detector once on the changed files:
   `node <impeccable-skill-dir>/scripts/detect.mjs --json <files>`.
2. Check the project-specific bar on top of the audit:
   - Tokens only: every color is a semantic shadcn utility (`pnpm biome check` must pass;
     the GritQL plugin and `noTailwindRawColors` catch hard-coded colors).
   - No AI slop: no cards inside cards, no gradient text or generic gradients, no eyebrow
     labels above headings, no filler sections, no emoji instead of icons.
   - Contrast: body text >= 4.5:1, large text >= 3:1, focus ring visible on every control,
     in light and dark (`prefers-color-scheme`).
   - Hierarchy: one primary action per screen (accent color), headings carry the page.
   - States: loading (skeleton), empty (teaches the next step), error (names the recovery),
     signed out, auth disabled, offline.
   - Mobile: 390px wide without horizontal scroll, touch targets >= 44px, primary actions in
     the bottom action bar, forms in the drawer, safe-area insets respected.
   - Sorting/filtering state survives a reload (it lives in the URL).
3. Take screenshots at 1280x800 and 390x844 (light and dark) of each state you changed, e.g.
   with Playwright against `pnpm dev`, and look at them.
4. Fix P0/P1 findings in one batch, re-check once, then invoke `impeccable` with `polish`.
5. Put the screenshots and a short list of what changed in the PR description.
