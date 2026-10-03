# Design

Recorded from the built app shell and trips screen (October 2026). Source of truth for tokens:
`src/styles/index.css`.

## Mode and world

Operate surface: the tool disappears into the task. shadcn/ui new-york on a zinc neutral base
with **one accent, "route green"** (`--primary`, light `oklch(0.5 0.12 162)` ≈ #00774d, dark
`oklch(0.76 0.13 162)`). The accent marks only: the primary action, the active place (nav, sort
column), focus rings and the brand mark's destination. Everything else is neutral.

Light and dark follow `prefers-color-scheme` (no toggle); browser chrome follows via `theme-color`.

## Type

System UI stack (SF on iOS, Roboto on Android) for a native feel in the installed PWA.
Page title `text-2xl md:text-3xl font-semibold tracking-tight`; body `text-sm`; secondary text
`text-muted-foreground`; dates `tabular-nums`.

## Layout

- Content column `max-w-5xl`, gutters 16px (phone) / 24px.
- Desktop: one 56px top bar: brand, env badge (non-production), nav, primary action, account.
- Phone: slim top bar + fixed bottom action bar (Trips, round primary "+" 56px, Account),
  safe-area insets respected; content padded so nothing hides under the bar.
- Lists are tables, not cards: rows separated by hairlines; on phones secondary columns fold
  under the primary cell.

## Components and states

- Forms: `ResponsiveModal` = vaul drawer on phones, dialog on desktop; 44px inputs on phones.
- States: skeleton rows while loading; `StatusMessage` (icon, title, one sentence, one action)
  for empty, no-results, signed-out, auth-disabled, offline and error.
- Brand mark: start dot, two steps, destination ring in the accent (`BrandMark`, `public/logo.svg`).

## Bans

Hard-coded colors (enforced by Biome), cards in cards, gradient text, glass, eyebrow labels,
decorative motion, emoji as icons.
