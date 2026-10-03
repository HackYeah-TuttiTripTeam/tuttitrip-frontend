# Product

<!-- impeccable:product-schema 1 -->

> Updated 3.10.2026 with `/impeccable init`: confirmed by the team lead in an interview round,
> plus the architecture document, the HackYeah 2026 project plan and the team's backlog decisions.

## Platform

web

## Users

- **Host (organizer).** Usually one parent or carer, sometimes the most motivated member of a group of
  friends, who plans a city break, a day out or an evening for everyone. Speaks for people without the
  app. Mostly on a phone in short sessions between other things; also plans on a laptop.
- **Co-host.** A member the host lets edit the trip, the plan and the members.
- **Member.** A person with an account who joined from an invitation: gives own preferences, confirms or
  leaves, approves, rejects or comments on a plan proposal, adds expenses.
- **Profile without an account.** A child or a grandparent created by the host, with defaults from age.
- **Person with a voting link.** Rates places and vetoes without an account or install.
- **App administrator.** Superadmin from the Auth0 list: users, permissions, algorithm parameters.
- **Hackathon jury.** Opens the app through a demo link with prepared data and must see the value in
  minutes, on a phone or a projector.

## Product Purpose

Plan a trip nobody feels they lost on, and show that it is fair. The host starts with one sentence and
answers an assistant with cards instead of a form. A deterministic algorithm turns everyone's preferences,
weights, constraints and budget into a plan; a plan check counts what a chatbot plan gets wrong; an
accommodation contract checks pasted offers against requirements. The algorithm is the core of the
product and is specified in `docs/algorytm.md` in tuttitrip-backend (fairness algorithm v1.0); everything
else follows it. Success: the host gets a first plan within minutes and every person can see what they
got: their share of what they could get alone (`r`), the group's lowest share and the Jain index.

## Positioning

Decisions and verification around a plan, not another plan generator. Per-person utility and a visible
fairness measure, a verdict per place with who is for and against and why, overrides that show their
cost, and a plan check that works on plans from any other tool. Language models only ask questions,
write justifications and parse pasted text; the plan is computed by code, so the same input always gives
the same plan.

## Operating Context

- A phone first, as an installable PWA; laptop for longer planning sessions.
- Live 3-minute demo on stage: interview from one sentence, plan with the fairness measure and the weight
  slider, a veto from a voting link, the plan check on a chatbot plan, and the host's consent to a budget
  overrun with the price per point, next to the plan hash that proves the same input gives the same plan.
- Prices and opening hours shown as "verified" come only from the team's own sheet (Warszawa, Berlin,
  Kraków, Londyn) and OpenStreetMap, with a source and a date; anything else is marked unverified.
- The map is Google Maps; Google place details appear only as a Places UI Kit card for the reader.

## Capabilities and Constraints

- Any city on demand from open data; four demo cities prepared by hand: Warszawa, Berlin, Kraków, Londyn.
- Roles: host, co-host, member, profile without account, voting link, app administrator (superadmin).
- Interview by text (AG-UI) and by voice (speech-to-speech in the cloud); "Save and come back" and a
  first plan before the interview ends.
- UI in Polish and English from the start (the React app supports both); Polish is the default.
- Integrations only after explicit approval (calendar file, booking search links); the app never buys or
  books anything.
- Hackathon: 24 hours, 5 people; the live demo must not fail. Judging includes Design 20% and Usability
  20%.
- Outside algorithm v1.0 and therefore not in the core: rain replanning, splitting the group during a day,
  a different accommodation base per night, per-day weights. They may come later as extensions that do not
  change the algorithm.
- Undecided: the demo script city (one of the four), the exact wording of the pitch claims.

## Brand Commitments

- Name: TuttiTrip only. The earlier working name WARTO is retired from the UI, docs and pitch.
- Visual system: the TuttiTrip design system (`.claude/skills/tuttitrip-design-system`) is binding for
  every UI change: tokens, fonts, Keyline icons, components, screens and the UI glossary.
- Logo: the "Horyzont" mark, a round badge with a road running to the horizon under a gold goal ring,
  used only as the design system ships it (no recolouring, outline, shadow, gradient, rotation or
  stretching; always with its own badge; at least 24px). The wordmark is outlined Funnel Display and is
  never retyped. The tagline "Plan, po którym nikt nie czuje, że przegrał" is fixed and stays out of the
  app chrome.
- Voice: Polish on "Ty", short, like a well-organized family member; verbs on buttons; no emoji.

## Evidence on Hand

- No user research, testimonials, customer quotes, survey results or adoption numbers exist. Do not
  invent any, in the UI, on the landing page or in the pitch.
- The three numbers for the jury (violations in a chatbot plan vs ours, repeatability of the plan hash,
  time from one sentence to a first plan) must be measured on real data before they are shown.
- Real assets: the Horyzont logo (`public/brand/`, source in `.claude/skills/tuttitrip-design-system/assets/Logos`) and app icons (`assets/AppIcons`),
  the design system components and screens, the demo city sheet.

## Product Principles

1. Fairness is visible: every decision shows who gains and who gives something up.
2. Computed, not guessed: numbers, hours, prices and verdicts come from code with a source; uncertainty
   is shown, never hidden.
3. The human decides: the system proposes, explains and checks; anything that touches other people or
   money waits for the host's approval.
4. One organizer, minimal typing: cards, defaults from age, one-thumb actions on a phone.
5. Works on the go: installable PWA with honest offline, loading and error states.

## Accessibility & Inclusion

Used by families including children and seniors: WCAG AA contrast, 44px touch targets, Atkinson
Hyperlegible for low-vision readers, no information carried by color alone (dashed line for uncertain,
icons and text next to color), `prefers-reduced-motion` respected.
