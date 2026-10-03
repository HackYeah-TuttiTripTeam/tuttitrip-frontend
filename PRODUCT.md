# Product

<!-- impeccable:product-schema 1 -->

> Inferred from the HackYeah 2026 project plan ("WARTO: plan projektu", v6) during repo setup;
> no interview round was held. Correct anything that is wrong.

## Platform

web

## Users

A parent or carer who organizes a city break or a group outing for the whole family or group.
Usually one organizer uses the app and speaks for everyone; the other people are profiles
(child, teen, adult, senior), optionally voting through a link without an account. Mostly on a
phone, often in short sessions between other things; planning also happens on a laptop.

## Product Purpose

Plan a trip nobody feels they lost on, and show that it is fair. The organizer runs a short AI
interview with cards instead of a form; a fairness solver weighs everyone's "want / don't want /
why", a plan linter checks opening hours, distances and the slowest person's pace, and an
accommodation contract checks offers against requirements.

## Positioning

Decisions and verification around a plan rather than a plan generator: per-person preferences,
a mediator verdict per place with an overridable cost, and a linter that catches what chatbot
plans ignore. Compared with Wanderlog, Mindtrip and Google's group plans.

## Capabilities and Constraints

- MVP: any city on demand; Warsaw, Berlin and Kraków pre-filled; 4 personas; budget range.
- Integrations only with explicit approval (Calendar, Drive export, booking links, local receipt reading).
- Hackathon: 24h, 5 people; the live demo must not fail. Judging includes Design 20% and Usability 20%.
- UI language: Polish.

## Product Principles

1. Fairness is visible: every decision shows who gains and who gives something up.
2. The human decides; the system proposes, explains and checks.
3. One organizer, minimal typing: cards, defaults, one-thumb actions on a phone.
4. Works on the go: installable PWA, honest offline and error states.

## Accessibility & Inclusion

Used by families including seniors: WCAG AA contrast, 44px touch targets, readable type,
no information carried by color alone.
