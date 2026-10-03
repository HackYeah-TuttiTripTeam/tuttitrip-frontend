---
name: TuttiTrip
description: Plan, po którym nikt nie czuje, że przegrał. Policzony, a nie zgadnięty.
colors:
  paper: "oklch(98.6% 0.005 165)"
  ink: "oklch(21% 0.02 170)"
  sheet: "oklch(100% 0 0)"
  route-green: "oklch(50% 0.12 162)"
  route-green-on: "oklch(99% 0.01 162)"
  quiet-ink: "oklch(48% 0.02 170)"
  hairline: "oklch(90% 0.01 165)"
  control-edge: "oklch(64% 0.02 170)"
  want-soft: "#dcf2e6"
  want-ink: "#00603f"
  decline: "#c2410c"
  decline-soft: "#fff0e6"
  warning: "#a16207"
  warning-soft: "#fdf3c4"
  destructive: "oklch(57.7% 0.245 27.325)"
  danger-soft: "#fdecec"
  route-dot: "oklch(78% 0.015 168)"
  brand: "#00774d"
  member-1: "oklch(50% 0.11 250)"
  member-2: "oklch(50% 0.12 295)"
  member-3: "oklch(52% 0.09 210)"
  member-4: "oklch(52% 0.13 355)"
  member-5: "oklch(52% 0.09 115)"
  member-6: "oklch(46% 0.03 260)"
typography:
  display:
    fontFamily: "Funnel Display, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: "44px"
  title-1:
    fontFamily: "Funnel Display, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "32px"
    lineHeight: "36px"
  title-2:
    fontFamily: "Funnel Display, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "22px"
    lineHeight: "28px"
  title-3:
    fontFamily: "Funnel Display, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "18px"
    lineHeight: "24px"
  metric:
    fontFamily: "Funnel Display, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: "40px"
    fontFeature: "tnum"
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "17px"
    lineHeight: "26px"
  body-sm:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "15px"
    lineHeight: "22px"
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "20px"
  caption:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "13px"
    lineHeight: "18px"
  code:
    fontFamily: "Atkinson Hyperlegible Mono, ui-monospace, monospace"
    fontSize: "15px"
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "28px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
components:
  button-primary:
    backgroundColor: "{colors.route-green}"
    textColor: "{colors.route-green-on}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: "44px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: "44px"
  card:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
  chip-want:
    backgroundColor: "{colors.want-soft}"
    textColor: "{colors.want-ink}"
    rounded: "{rounded.full}"
---

# Design System: TuttiTrip

Normative source: the skill `.claude/skills/tuttitrip-design-system` (`README.md`, `theme.css`,
`tokens.json`, `components/*`, `components/Screen*`). `src/styles/theme.css` is a verbatim copy of its
`theme.css`. This file records how the system applies to the app; when they disagree, the skill wins and
this file is refreshed with `/impeccable document`.

## Overview

**Creative North Star: "Policzony, a nie zgadnięty" (computed, not guessed).**

The interface shows that a plan was counted: numbers, hours, prices and verdicts come from the solver and
the plan check, and the language model only writes questions and justifications. It sits on shadcn/ui and
Tailwind v4 but deliberately does not look like default shadcn: paper background with a green note
instead of zinc, Funnel Display and Atkinson Hyperlegible, 44px pill buttons, flat sheets without
shadows, and the route motif from the logo mark (dots, stops and the destination ring).

Operate surface first: phone portrait 360 to 430px, a floating dock, short sessions. Public pages
(landing, about) are a desktop 1200px layout.

**Key Characteristics:**
- Every person is visible: avatar in a `member-N` color, name, and who is for and against.
- Number first, then one sentence from code ("Najmniej zadowolony: Kuba, 58.").
- Solid means fact, dashed means uncertain (unconfirmed requirement, unverified price, "Kultowe, ale nie
  Twoje", uncertain receipt read).
- A decision has a price: actions that cost others use the `ink` button with the cost in the label and go
  through the approval card. Green means only "chcę" and a safe next step.

## Colors

Paper and ink with a green note (hue 165), one route green for the safe step, and four state colors with
exactly one meaning each.

### Primary
- **Route Green** (`oklch(50% 0.12 162)`, dark `oklch(76% 0.13 162)`): one safe action per screen, the
  active tab, selection, the "chcę" vote, a completed step. Kept from production.

### Neutral
- **Paper** (`background`): screen background. **Sheet** (`card`): cards and lists lying on paper.
- **Ink** (`foreground`): main text, and the background of the `ink` button and the active dock item.
- **Quiet Ink** (`muted-foreground`), **Hairline** (`border`), **Control Edge** (`input`, at least 3:1).

### State colors
- **Want** (`want`, `want-soft`, `want-ink`): chcę, met, safe step.
- **Decline** (`decline`, `decline-soft`, `decline-ink`): nie chcę, a change for the worse.
- **Warning** (`warning`, `warning-soft`, `warning-ink`): budget margin, a decision waiting.
- **Destructive** (`destructive`, `danger-soft`, `danger-ink`): not met, error, deletion.
Each `*-ink` on its `*-soft` keeps at least 4.5:1 in both themes.

### People
- **member-1 to member-6** (blue, violet, teal, raspberry, olive, graphite): only avatars, a dot on an
  axis or a 3px bar. Never a state background.

### Named Rules
**The One Meaning Rule.** A state color means one thing everywhere; never borrow `decline` for emphasis
or `want` for decoration.
**The No Glow Rule.** No gradients, glows, glass or gradient text.

## Typography

**Display Font:** Funnel Display (fallback Atkinson Hyperlegible Next, system-ui)
**Body Font:** Atkinson Hyperlegible Next (fallback system-ui)
**Mono:** Atkinson Hyperlegible Mono, only for invitation codes

**Character:** a distinctive funnel-cut display face for headings and every number, paired with the
Braille Institute face built for low-vision readers, because the plan is read by a grandmother and a
child. Fonts are local variable woff2 files with Polish glyphs (offline in the PWA, no Google Fonts).

### Hierarchy
- **Display** (800, 44/44): trip title.
- **Title 1** (32/36): screen. **Title 2** (22/28): section, day, card, sheet. **Title 3** (18/24): place, row.
- **Metric** (800, 40/40, tabular) and **Figure** (650, 16/24): numbers.
- **Body** (17/26): text. **Body small** (15/22): metadata.
- **Label** (600, 15/20): buttons, chips, labels. **Caption** (13/18): sources, axes; the minimum size.

### Named Rules
**The Sentence Heading Rule.** Headings are plain sentences in the display face; no uppercase eyebrows
above them; group labels in normal case ("Dlaczego nie?", "Co już wiem").

## Layout

4px grid. Screen margin `space-4` (16px), sheet padding `space-4` (desktop `space-5`), section gap
`space-6`, day gap `space-8`. Content column `--content-max` (32rem) on phones; every touch target at
least `--tap-min` (44px); navigation in a floating dock (`--bottom-nav` 68px) with safe-area insets.

## Elevation & Depth

Flat by default: sheets are `card` with a `border` hairline and no shadow, one level of sheets per screen,
rows inside are lists with hairlines. `--shadow-float` exists only for floating elements: the dock, the
bottom sheet and tooltips. Focus is a 2px `ring` outline with a 2px offset.

## Shapes

Radii larger than shadcn: sheets `radius-lg` 20px, bottom sheet and approval card `radius-xl` 28px,
fields `radius-md` 12px, buttons, chips and avatars `radius-full`. The route motif is the shape
language: route dots (2px every 8px) connect stops, a 10px stop dot (done in `primary`, waiting in
`route`), an 18px destination ring for the day goal, budget limit and current calculation step, a 16px
person dot on the fairness axis, and a ticket perforation that separates a decision from its buttons.

## Components

Components are static references in the skill (`components/<Name>/README.md`, `preview.html`, classes
`tt-*` in `bundle.css`, props in `index.d.ts`); each README says which shadcn element or registry
component to start from.

- Actions and state: `Button` (primary, ink, secondary, ghost; 44px pills), `Badge`, `VerdictBadge`.
- People: `PersonChip`.
- Preferences and interview: `RatingControl`, `ImportancePool`, `InterviewCard`.
- Planning: `PlaceCard`, `PlanTimeline`, `PlanProgress`, `FairnessMeter`, `FairnessLedger`,
  `LinterReport` (UI name "Sprawdzenie planu"), `OverrideCost`, `ApprovalCard` ("Czeka na Twoją
  decyzję"), `BudgetBar`.
- Places: `RequirementCheck` (met, not met, unconfirmed with a dashed line).
- During the trip: `ReplanBar`. Expenses: `Settlement`. Navigation: `BottomNav`.
- Screens to copy layouts from: `ScreenLanding`, `ScreenAbout`, `ScreenDashboard`, `ScreenSettings`,
  `ScreenPlanBuilder`, `ScreenInterviewVoice`, `ScreenInterviewChat`, `ScreenDecisions`.

Icons: Keyline Icons (`@keyline-icons/react`, MIT), stroke, rounded, 24 grid, 2px line; 20px in controls,
16px in chips and rows, always `currentColor`; two-tone only for the "kultowe" star, the "zweryfikowana"
shield and the assistant sparkles. An icon never stands alone for a state; icon buttons have `aria-label`.

Motion: only what code computed moves (counting numbers, people moving on the axis, problems appearing,
plan calculation steps), 150 to 250ms `cubic-bezier(.4,0,.2,1)`, numbers up to 600ms; nothing moves under
`prefers-reduced-motion`.

## Do's and Don'ts

- Do take colors, spacing, radii and fonts only from `theme.css` tokens (`bg-background`,
  `text-muted-foreground`, `bg-want-soft`, `font-heading`); Biome rejects raw colors in classes.
- Do restyle every registry component (`@react-bits`, `@aceternity`, `@shadcn-space`) onto these tokens
  and swap its lucide icons for Keyline before use.
- Do write UI copy from the glossary in the skill README, in Polish and English, on "Ty", verbs on
  buttons ("Zbuduj plan teraz", "Wymuś mimo to"), numbers as "0,87", "1 240 zł", "09:30", "sob 4 paź".
- Do name missing data plainly ("Budżet: nie ustalono") and give every screen loading, empty, error,
  offline and signed-out states.
- Don't show component names or rule codes to people ("Czeka na Twoją decyzję", not "Karta
  zatwierdzenia"; "godziny otwarcia", not `closed_day`).
- Don't use Aurora, Background Beams, Sparkles, Meteors, Spotlight, Lamp, Vortex, Glowing Effect,
  Shine or Moving Border, gradient text, 3D or tilt cards, Hero Parallax, cards inside cards, or emoji.
- Don't use shadows on resting sheets, uppercase eyebrows, or green for anything but "chcę" and the safe
  next step.
