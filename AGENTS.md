# AGENTS.md

Canonical instructions for anyone (human or agent) changing this repository.
`CLAUDE.md` imports this file. The guide for people is `README.md` (Polish).

## What this is

TuttiTrip (working name WARTO) is a group and family trip planner built at
HackYeah 2026. One organizer runs an AI interview for the whole family; a
fairness solver, a plan linter and an accommodation contract turn the answers
into a plan nobody feels they lost on. This repo is the web client: a
mobile-first PWA. The API is `tuttitrip-backend` (FastAPI), consumed through
types generated from its `/api/v1/openapi.json`, and called same-origin
through the Worker's `/api/*` proxy.

Judging weighs Design (20%) and Usability (20%). UI quality is part of the
product, not decoration.

## Philosophy

- **The TuttiTrip design system is binding for every UI change.** Skill
  `tuttitrip-design-system` (`.claude/skills/tuttitrip-design-system`); see
  "UI: design system i impeccable" below. Product context lives in
  `PRODUCT.md`, the recorded visual system in `DESIGN.md`.
- **Run impeccable on every new or changed screen** (critique, audit, the
  de-slop passes, polish) through the `impeccable-review` skill before the
  subagent review.
- **Only design-system tokens.** Colors, fonts, radii and spacing come from
  `src/styles/theme.css` (a verbatim copy of the skill's `theme.css`) as
  semantic utilities (`bg-primary`, `text-muted-foreground`, `bg-want-soft`,
  `font-heading`...). Never `bg-[#...]`, `text-[rgb(...)]`, `hsl(...)` or raw
  palette colors like `bg-red-500`: Biome fails the build on them.
- No AI slop: no cards inside cards, no generic gradients, no filler sections,
  no eyebrow labels above headings. Every screen has loading, empty, error and
  signed-out states.
- Mobile first. Primary actions sit in the bottom action bar on phones, forms
  open in a `vaul` drawer on phones and a dialog on desktop
  (`components/shared/responsive-modal.tsx`). Touch targets are at least 44px.
- UI copy is Polish and English (Polish is the default); words come from the
  UI glossary in the design-system README. Every new string goes into both
  `messages/*.json` files (see "Tłumaczenia"). Code, comments and commit messages
  are English.

## Stack

| Concern | Choice |
| --- | --- |
| Package manager | `pnpm` only (version pinned in `packageManager`) |
| Build | Vite 8, React 19, TypeScript 6 (strict, `noUncheckedIndexedAccess`) |
| Routing | TanStack Router, file-based (`src/routes/`), type-safe search params (`validateSearch` + Zod 4) |
| Server state | TanStack Query + `openapi-fetch` + `openapi-react-query` (`$api` in `src/api/client.ts`) |
| API types | `openapi-typescript` -> `src/api/schema.d.ts` (committed) |
| UI / session state | Zustand (`src/stores/`) |
| Forms | `react-hook-form` + Zod (`@hookform/resolvers`) |
| Tables | TanStack Table v9 (`useTable` + `tableFeatures`) |
| UI kit | shadcn/ui (new-york) restyled by the TuttiTrip design system (tokens and fonts in `src/styles/`), Tailwind v4 |
| Icons | Keyline Icons (`@keyline-icons/react`); lucide is not used |
| Auth | Auth0 (`@auth0/auth0-react`), Google and Discord connections |
| i18n | Paraglide JS (`@inlang/paraglide-js`): `messages/pl.json` + `messages/en.json`, generated `src/paraglide` (gitignored) |
| Unit tests | Vitest (`*.test.ts` next to the code) |
| Lint / format | Biome 2 (strict; GritQL plugin for colors) |
| Architecture tests | dependency-cruiser + `scripts/check-arch.mjs` |
| PWA | `vite-plugin-pwa` (generateSW), icons copied from the design system (`assets/AppIcons`) into `public/` |
| Hosting | Cloudflare Workers: static assets + `/api/*` proxy script (`wrangler.jsonc`, `worker/index.ts`) |

shadcn registries allowed by the design system: `@react-bits`, `@aceternity`,
`@shadcn-space` and `@keyline` (`pnpm dlx shadcn@latest add @react-bits/<name>`;
the list of components to use is in the skill README). Install only components
you use, restyle them onto our tokens and swap their lucide imports for
`@keyline-icons/react` before committing.

## Commands

```bash
pnpm install
cp .env.example .env.local      # backend URL for the /api dev proxy + Auth0 (all optional locally)
pnpm api:sync                   # regenerate src/api/schema.d.ts (see below)
pnpm dev                        # http://localhost:5173, /api proxied to VITE_API_URL or :8000
pnpm dev:mock                   # MSW answers the API, fake signed-in user, ?scenario=<name> (see "Test data")

pnpm biome check --write .      # lint + format + organize imports
pnpm tsc -b                     # types (the root tsconfig only has references)
pnpm test:arch                  # architecture rules
pnpm build                      # tsc -b && vite build
pnpm i18n                       # compile messages/*.json into src/paraglide (runs on install, verify, build)
pnpm test                       # unit tests (Vitest project `unit`), what CI runs
pnpm test:integration           # slow tests (`*.int.test.*`: real production builds), local only
pnpm test:local                 # pnpm test + pnpm test:integration
pnpm verify                     # i18n + biome ci + tsc + test:arch + test, what CI runs (no build, no integration)
```

## Test data and mock API mode (MSW)

`src/mocks/` holds MSW 3.0.1 handlers and fixtures typed from `src/api/schema.d.ts` (no
hand-written shapes: after `pnpm api:sync` a contract change breaks `tsc`, not the data
silently). Amounts are decimal strings. MSW 3 keeps the 2.x API (`http`, `HttpResponse`,
`setupServer`, `setupWorker`); the one rename to know is `onUnhandledRequest` -> `onUnhandledFrame`
(in `listen()` and `start()`). Profiles carry `customized_fields`; members (host, co-host, member,
with `is_me`) are served from `/trips/{id}/members` and join profiles on `profile_id`. Named scenarios (`src/mocks/scenarios.ts`):

| Scenario | What it serves |
| --- | --- |
| `family-warsaw` (default) | Host with a family of five (grandmother, two children); plan with verified and unverified prices, a stop without a source for hours, transfers with and without cost |
| `needs-approval` | Same plan, budget above B_do in the margin, with kappa and a pending approval |
| `no-plan` | `GET plans/latest` is 404 until `POST plans` ("Policz plan") creates it |
| `member-readonly` | The caller is a member: reads work, writes answer 403 |
| `server-error` | 500 for every API call |
| `offline` | Network error for every API call |
| `join-valid` | Opening an invitation link (`/join#t=<any token>`): preview 200, accept 200; the host's invitation list has one working invitation |
| `join-dead` | Preview and accept answer 404 (expired, revoked or full: one answer for all) |
| `join-already-member` | Preview says `already_member`; accept is idempotent |
| `join-accept-dead` | Preview 200, then accept 404 (the link died in between) |

- **In tests:** `src/mocks/vitest-setup.ts` starts one `setupServer` and serves
  `family-warsaw` before each test. Pick another with `useScenario('no-plan')` (from
  `@/mocks/node`; the optional `tweak` changes the data for a state no scenario has) and render the whole app with `renderApp('/trips')`
  (`@/mocks/render-app`). Do not stub `fetch` by hand; write flow tests (list, trip,
  tabs, "Policz plan") on scenarios. State is created per test, so tests do not leak.
- **In the browser:** `pnpm dev:mock`, then open `http://localhost:5173/trips?scenario=<name>`.
  The choice is kept in `sessionStorage` for the tab (the router drops the query param).
  A fake Auth0 user is signed in, no password, no network. Mock mode needs `VITE_API_MOCK=1`
  outside a production build (`__API_MOCK__`, defined once in `vite.config.ts`), removes any
  PWA service worker and registers none. An `/api` call without a mock handler answers 501
  "No mock handler for ..." and never reaches the real backend.
  Keep the tab in the foreground: TanStack Query pauses retries in a hidden tab, so
  `offline` and `server-error` look like endless loading there.
- **New scenario:** add its name to `scenarioNames` and a `case` in `createWorld`
  (`src/mocks/scenarios.ts`; the switch fails `tsc` until you do), then a test that uses it.
- **Smoke tests by agents:** states (empty, error, readonly, approval, offline) go through
  `pnpm dev:mock`; the real API goes through the local proxy to the develop API (`pnpm dev`),
  or through the PR preview when the PR has the label `preview`. Report both.
- **Build safety (rule 8):** `src/mocks/` is imported only by test files and `src/main.tsx`
  (behind `__API_MOCK__`); `msw` only inside `src/mocks/`
  (`scripts/check-arch.mjs`). `scripts/dist.int.test.mjs` and `scripts/pwa-build.int.test.mjs` (integration, `pnpm test:integration`, local pre-PR checks) build and fail if MSW, the worker
  script or the fake session are in the bundle. A field missing in the schema lands with
  the backend, never as a hand-written fixture shape.

## Folders

```
src/
├── routes/            route definitions only (.ts, no JSX): component, loader, validateSearch
├── views/             pages: compose components + hooks, read search params via getRouteApi
├── components/ui/     shadcn atoms and registry components (generated, edit sparingly)
├── components/shared/ shared blocks: app shell, responsive modal, status messages
├── components/<feature>/ presentational pieces of one feature (e.g. trips/)
├── hooks/             business and helper hooks, .ts only
├── stores/            Zustand stores
├── loaders/           search-param schemas (Zod), loader functions, router context type
├── api/               openapi-fetch client ($api), schema.d.ts, queries/ (query options + DTO types), errors
├── mocks/             MSW handlers, fixtures, scenarios; tests and `pnpm dev:mock` only
├── lib/               framework-free helpers: env, formatting, cn, query client, PWA registration
├── styles/            index.css: the design tokens (the only place colors are defined)
├── assets/            photos of the public pages (AVIF/WebP) and their CREDITS.md
└── paraglide/         generated by Paraglide from messages/*.json; never edit, never commit
```

`main.tsx` (providers) and `router.tsx` are the composition root.
`routeTree.gen.ts` is generated by the router plugin on `pnpm dev`/`build` and
committed on purpose; never edit it.

**Detail page next to a list view** (no `<Outlet/>` in the list): name the route `<list>_.$id.ts`
(e.g. `trips_.$tripId.ts`), the trailing `_` makes it a sibling instead of a child of the list.

**Where loaders and search schemas live:** `src/loaders/<feature>.ts`. A route
file imports its view and its loader module, nothing else. Loaders import query
options from `src/api/queries/`, so a route never touches the API directly.

## Architecture rules (`pnpm test:arch`, Biome)

1. **Views do not import other views.** Shared UI goes to `components/`,
   shared logic to `hooks/`. (dependency-cruiser `views-no-cross-import`)
   A view that is a tab's content is named `<parent>.<tab>.tsx` (`trip-view.plan.tsx`).
2. **`components/**` are presentational.** No imports from `views/`, `hooks/`,
   `stores/`, `loaders/`, `routes/`, and no runtime use of the API client,
   TanStack Query, Zustand or Auth0. Type-only imports of API/loader types are
   allowed. Data and callbacks come in as props.
   (`components-are-presentational`, `components-no-data-layer`)
3. **Hooks contain no JSX.** `hooks/` holds `.ts` files only, no
   `createElement`, no imports of components or views.
   (`scripts/check-arch.mjs` + `hooks-no-jsx`)
4. **Routes import only views and loaders** (plus `@tanstack/react-router` and
   `zod`), and are `.ts` files so no JSX or UI logic lands there.
   (`routes-only-views-and-loaders` + `scripts/check-arch.mjs`)
5. **No hard-coded colors in Tailwind classes.** `biome-plugins/no-hardcoded-colors.grit`
   (GritQL) rejects arbitrary color values (`bg-[#fff]`, `text-[rgb(...)]`,
   `border-[hsl(...)]`, `[color:oklch(...)]`) in any string, className, `cn()`
   or `cva()`; Biome's `noTailwindRawColors` rejects palette colors
   (`bg-red-500`). Runs in `pnpm biome check` / `biome ci`.

Also enforced: no circular imports, no unresolvable or undeclared packages,
loaders/stores/api stay UI-free, and only the folders above exist in `src/`.
Each rule was proven to fail on a deliberate violation. If you need to break
one, change the rule here and in the config in the same PR, with a reason.

## Tłumaczenia (PL i EN)

Każdy tekst interfejsu trafia do **obu** plików wiadomości, `messages/pl.json` (język domyślny) i
`messages/en.json`, pod tym samym kluczem i z tymi samymi `{parametrami}`. Nie wpisujemy tekstów w
widoki ani komponenty.

- Użycie: `import { m } from '@/paraglide/messages'`, potem `m.klucz({ parametr })`. Klucze
  `domena_element` w snake_case (`trips_empty_title`). Liczba mnoga przez wariant `plural` w JSON
  (wzór: `trips_count`), nie przez sklejanie w kodzie.
- Teksty wołamy w renderze (albo przez funkcję `() => m.klucz()`), nie w stałej modułu, której wynik
  zależałby od języka z chwili importu. Wyjątek: schematy Zod z `error: () => m.klucz()`.
- Słownik pojęć ze skilla (`glossary_*`, `verdict_*`, `vote_*`, `reason_*`) ma wpisy w obu językach;
  nowe pojęcia dopisz tam i do tabeli poniżej (folder skilla to kopia wzorca, nie edytujemy go).
- Daty, godziny, kwoty i liczby tylko przez `src/lib/format.ts` (`Intl` z bieżącym językiem).
- Język wybiera: zapamiętany wybór (localStorage), potem język przeglądarki, potem polski. Zmiana
  przez `useLocale().setLocale` przeładowuje dokument. `<html lang>` ustawia `lib/i18n.ts`.
- Klient API wysyła `Accept-Language` z bieżącym językiem; teksty błędów z API przychodzą w tym języku.
- Teksty dla programistów (nazwy zmiennych `VITE_*`, „zgłoś zespołowi”) mają osobny klucz z
  sufiksem `_dev` i widać je tylko przy `isDev` (`lib/env.ts`); użytkownik dostaje tekst ogólny.
- Opcje Paraglide (strategia języka) są w jednym miejscu, `i18n.config.mjs`: czytają je
  `scripts/i18n.mjs` (`pnpm i18n`) i `vite.config.ts`. Auth0 dostaje `ui_locales` z bieżącego języka.
- `pnpm test:arch` pilnuje kompletu kluczy w pl/en i heurystycznie wyłapuje teksty na sztywno
  (reguła 7, wzorce w `scripts/ui-text-rules.mjs`, testy wzorców w `ui-text-rules.test.mjs`):
  w `views/` i `components/` (poza `components/ui/`) atrybuty `placeholder`, `aria-label`,
  `aria-description`, `title`, `alt`, `label` oraz tekst JSX między tagami w jednej linii lub
  zawinięty w osobną linię (min. dwa słowa); w `views/`, `components/` i `hooks/` (bez testów)
  literały napisów, które wyglądają jak zdanie (min. dwa zwykłe słowa albo jedno słowo wielką literą
  z min. 4 literami). Nie wykrywa: pojedynczego małego słowa w osobnej linii JSX, tekstu składanego
  z kilku literałów, literałów w liniach z `className`/`cn`/`cva`, jednowyrazowych literałów pisanych
  małą literą. To pomoc, nie dowód: reszta wychodzi w review.

### Słownik pojęć PL / EN

| PL | EN |
| --- | --- |
| podróż / wyjazd | trip |
| wyjście | outing |
| host, co-host, członek | host, co-host, member |
| profil | profile |
| werdykt | verdict |
| weto | veto |
| decyzja hosta (override) | host's decision (override) |
| sprawdzenie planu, problemy | plan check, issues |
| przeplanowanie | replan |
| rozliczenie | settlement |
| Obowiązkowo / Pasuje / Kultowe, ale nie Twoje / Pomiń | Must do / Good fit / Iconic, but not for you / Skip |
| Chcę / Obojętnie / Nie chcę | Want / Don't mind / Don't want |
| Za drogo / Za daleko / Nie mój klimat / Za duży tłum / Za trudne dla dziecka / Inne | Too expensive / Too far / Not my vibe / Too crowded / Too hard for a child / Other |

- Poza zakresem: manifest PWA (`vite.config.ts`) i `index.html` mają opis po polsku, bo nie znają
  języka użytkownika.

## Data flow for a feature (example: trips)

```
api/queries/trips.ts      tripsQueryOptions() = $api.queryOptions('get', '/api/v1/trips')
loaders/trips.ts          tripsSearchSchema (q, sort, dir) + loadTrips (prefetch)
hooks/use-trips.ts        useQuery + filter/sort by the search params
hooks/use-create-trip.ts  $api.useMutation('post', '/api/v1/trips') + invalidate
components/trips/*        TripsTable (TanStack Table), TripsToolbar, CreateTripForm (RHF + Zod)
views/trips-view.tsx      wires hooks to components, maps UI events to navigate({ search })
routes/trips.ts           createFileRoute('/trips')({ validateSearch, search.middlewares, loader, component })
```

**Sorting and filtering always live in the URL.** Define a Zod schema with
`.default()` + `.catch()` for every param (bad URLs fall back instead of
erroring), pass it to `validateSearch`, strip defaults with
`stripSearchParams`, read with `getRouteApi('/x').useSearch()` and write with
`navigate({ search: (prev) => ({ ...prev, ... }), replace: true })`. Never
mirror search state in `useState` or Zustand.

## Lists

Every list view is paginated, filterable and sortable by the server, and
all of its state lives in URL query params.

- Build the route's search schema with `createListSearchSchema`
  (`src/loaders/list-search.ts`): page, size, sort, dir and the view's
  filters, each with `.default()` + `.catch()`, defaults removed by
  `stripSearchParams`, `validateSearch` on the route.
- Read with `getRouteApi(...).useSearch()` (through `useListSearch`), write with
  `useListSearch`. Page changes push history; filter, sort and size changes
  replace it and reset page to 1 (so Back leaves the list). Text filters go
  through `useDebouncedInput` (300 ms). Never mirror these in `useState` or
  Zustand.
- The query key holds the whole search object, `placeholderData` is
  `keepPreviousData` (`pagedQueryOptions`, type `Page<T>` in
  `src/api/queries/paged.ts`), and the loader prefetches the same key
  (`loaderDeps`). Writes invalidate the list by its key prefix.
- Send the search to the API as is. Do not filter or sort on the client.
  Clamp a page past the end (`useClampPage`) only from a real answer, never
  from placeholder data.
- Arrays (a multi-value filter) stay in the URL in the router's default JSON
  form (`role=["host","member"]`); the API request repeats the param.
- Row selection and open popovers are UI state, not search params. A fixed
  small list (the 5 latest in a popover) calls the same endpoint with
  constant params and no URL.

Auth: `hooks/use-api-auth-bridge.ts` hands Auth0's `getAccessTokenSilently`
to the openapi-fetch middleware in `api/client.ts`, which adds
`Authorization: Bearer <token>`. Without `VITE_AUTH0_DOMAIN` and
`VITE_AUTH0_CLIENT_ID` the app runs with auth disabled and says so in the UI.
The backend team owns the Auth0 tenant; do not create Auth0 apps or
connections from this repo.

## API contract and the branch -> API mapping

`pnpm api:sync` fetches `/api/v1/openapi.json` and regenerates `src/api/schema.d.ts`.
Source, first match wins: `--url <url-or-file>`, `API_SCHEMA_URL`,
`VITE_API_URL` + `/api/v1/openapi.json` (env or `.env.local`), then
`http://localhost:8000/api/v1/openapi.json`. Commit the regenerated file, so a fresh
clone builds without a backend.

A frontend branch talks to the backend branch of the same name. If that
backend deployment does not exist, it falls back to the nearest higher one:

| Frontend branch | Backend tried, in order | API URL |
| --- | --- | --- |
| `main` | main | `https://tuttitrip-api.gburek.app` |
| `develop` | develop, main | `https://tuttitrip-api-develop.gburek.app` |
| anything else | `<slug>`, develop, main | `https://tuttitrip-api-<slug>.gburek.app` |

`slug` = branch lowercased, every run of non `[a-z0-9]` turned into `-`,
trimmed, at most 49 chars (same as the backend's `deploy/lib.sh`).
`scripts/resolve-api.sh <branch>` implements it: a candidate counts when its
`/api/v1/openapi.json` answers (and, if `BACKEND_REPO_TOKEN` is set, when the
backend branch exists); a deployment still on the old unversioned paths does
not count, since it cannot serve this client. CI then runs `api:sync` from that
URL before type-checking (an API change that breaks the frontend fails CI), and
a preview Worker proxies to it (`--var API_ORIGIN:<api_url>`). If no deployment
answers, CI keeps the committed schema and the expected URL and prints a warning.

## API proxy (`/api/*`)

The app never knows the backend URL: `api/client.ts` has no `baseUrl` and the
paths in `schema.d.ts` start with `/api/v1`, so every call goes to its own
origin. No CORS, and the same build works in every environment.

- Deployed: `worker/index.ts` (typed by `tsconfig.worker.json`, plain Fetch API).
  `assets.run_worker_first` lists `/api/*`, `/assets/*`, the public pages (`/`, `/about`, `/contact`, `/prywatnosc`, also with a
  trailing slash) and `/robots.txt`, `/sitemap.xml`. It sends `/api/*` to the script before
  the assets, so the SPA fallback never answers an API path, and `/assets/*` so a
  missing build file is a 404 (the assets layer alone answers any missing GET with
  `index.html`, 200, without invoking the Worker; verified on a preview). It forwards method, headers
  (incl. `Authorization`), body and query to `API_ORIGIN`, streams the response
  back, and rewrites API redirects to the same origin. It drops hop-by-hop
  headers, `Cookie`, `Forwarded`, `X-Real-IP` and every client `X-Forwarded-*`/`cf-*`
  header, then sets `X-Forwarded-For` (from `CF-Connecting-IP`), `-Host`, `-Proto`.
  Under `/assets/*` it hands the request to `env.ASSETS` and turns an HTML answer
  for a file-like path into a 404 (see "PWA updates and caching"); it injects nothing there,
  and gives `/assets/photos/*` and `/assets/fonts/*` (kept unhashed so the first screen can
  point to them) a one-day cache with stale-while-revalidate instead of `immutable`. For the
  public pages it puts the page's metadata and first screen into `index.html` with
  `HTMLRewriter` (`src/lib/seo.ts`, `seo-shell.ts`): no validators of the static file are
  passed on, `Vary: Accept-Language` is set, `/about/` redirects to `/about`. `robots.txt`
  and `sitemap.xml` come from it too. `ENVIRONMENT` (Worker var, `production` only on main)
  decides indexing: any other value gives `Disallow: /` without a sitemap and
  `X-Robots-Tag: noindex` on the public pages (the build adds the same header to every
  response outside production, see `headersFile`). Every other path is served by the assets
  layer without the script.
- `API_ORIGIN` (Worker var): main `https://tuttitrip-api.gburek.app` and develop
  `https://tuttitrip-api-develop.gburek.app` in `wrangler.jsonc`; previews get
  the backend picked by `resolve-api.sh` via `--var` in `frontend-ci.yml`.
- Local: Vite's `server.proxy`/`preview.proxy` forward `/api` to `VITE_API_URL`
  or `http://localhost:8000` (`vite.config.ts`).
- The PWA service worker never serves the app shell for `/api/` navigations
  (the navigation route in `pwa.config.ts` skips them), so `/api/v1/docs` opens Swagger.
- The deploy smoke test also requests `/api/v1/health/live` with
  `Sec-Fetch-Mode: navigate` and expects JSON, not `index.html`.

## PWA updates and caching

Settings live in `pwa.config.ts` (used by `vite.config.ts`, tested in
`pwa.config.test.ts`; `scripts/pwa-build.int.test.mjs` builds develop and main and
checks the generated `sw.js` and `_headers`). Production is `VITE_APP_ENV=main`:
`scripts/resolve-api.sh` turns the branch (`github.head_ref || github.ref_name`)
into `app_env`, which is `main` only for the push to `main`, and the `checks`
job passes it to `vite build`. Every other value (develop, PR previews, local)
is not production.

- **Every build:** `skipWaiting` + `clientsClaim` are set explicitly. With
  `injectRegister: false` the plugin does not add them for `registerType:
  autoUpdate`, so a new service worker used to sit "waiting" until every tab was
  closed and returning browsers kept running an old build. `src/lib/pwa.ts`
  (`reloadOnControllerUpdate`) reloads the page once when a new worker takes
  control: it tracks the controller live, so the first install (claiming a page
  that had none) does not reload, every later `controllerchange` does, never twice.
  It also checks for a new version on `visibilitychange` and hourly.
  `cleanupOutdatedCaches` stays on. `index.html` is never precached and there
  is no `navigateFallback`.
- **Old installs:** `public/sw-activate.js` (imported by `sw.js`) runs on
  `activate` and navigates each open window that the previous worker controlled
  to its own URL once, so installs older than this fix get the fresh build on
  their first refresh instead of needing a manual Unregister. The first install
  has no controlled windows, so nothing reloads; a worker activates once per
  version and the reloaded page is already served by it, so there is no loop.
  A new-style page can be reloaded by both this and `controllerchange` in the
  same moment; the later navigation wins and it is one load. Open tabs lose
  unsaved form input on an update, same as with the page reload.
- **Stale chunks:** `src/lib/stale-assets.ts` reloads once (guard: 30 s in
  `sessionStorage`, so no loop) on `vite:preloadError` and, via the router's
  `defaultOnCatch`, on errors such as "Failed to fetch dynamically imported
  module". A missing file-like path (`/assets/x.js`, any extension but `.html`)
  under `/assets/*` that the SPA fallback would answer with `index.html` is a
  real 404 from the Worker (`assetsOr404` in `worker/index.ts`). Only `/assets/*`:
  the Worker never sees other static paths (they are not in `run_worker_first`), so a
  missing `/workbox-x.js` still gets the SPA fallback; `sw.js` is `no-cache` and always
  names the current one. The deploy smoke test checks `/assets/smoke-missing.js` -> 404.
  Cost: every `/assets/*` request runs the Worker script (free plan: about 100k
  requests a day). On `main` the precache answers repeat visits without the network,
  so mostly first visits and deploys count; develop and previews pay on every load.
- **Production (`main`):** navigations are `NetworkFirst` (3 s timeout,
  `app-shell` cache, one `/index.html` entry) so offline any deep link gets the
  shell; JS/CSS/icons and the fonts (`/assets/fonts/*.woff2`, about 85 KB)
  are precached, so the offline shell keeps the design-system typefaces (they keep their
  names, so `dontCacheBustURLsMatching` gives them a content revision and a deploy replaces them); photos are
  not (2.9 MB, public pages only), nor is the manifest (the Worker serves it per language). `/assets/*` and `/workbox-*` are
  immutable for a year; `sw.js`, `sw-activate.js`, `index.html` and the manifest
  are `no-cache`. Offline, the app shows `OfflineBanner` ("Brak połączenia", from
  `navigator.onLine` and the `online`/`offline` events) above the header on every
  build; the views keep their own error states for failed API calls.
- **TTL decision (issue #94):**

  | Path | `main` | develop, previews |
  | --- | --- | --- |
  | `/assets/*` (hashed) | `max-age=31536000, immutable` + precache | `no-cache` |
  | `/assets/photos/*`, `/assets/fonts/*` (unhashed) | `max-age=86400, stale-while-revalidate=604800` (Worker); fonts also precached | `no-cache` |
  | `/workbox-*` | `max-age=31536000, immutable` | `no-cache` |
  | `index.html`, navigations | `no-cache`; service worker `NetworkFirst` 3 s, then cache | `no-cache`, network only |
  | `sw.js`, `sw-activate.js`, manifest | `no-cache` | `no-cache` |

  Why: a hashed name changes with its content, so a year is safe and makes return
  visits free; anything whose name stays the same across deploys (the shell, the
  service worker, photos, fonts) is revalidated, so a deploy reaches an installed PWA
  on the next refresh. 3 s is how long a navigation waits on a weak signal before the
  cached shell is used. Nothing moves to develop: it exists to show each deploy at
  once, and offline is checked on a local `VITE_APP_ENV=main` build
  (`pnpm build && pnpm preview`).
- **Non-production (develop, previews):** short caching on purpose, so every
  deploy shows on the next load. The built `sw.js` has no `precacheAndRoute`
  (`includeAssets`, manifest icons and the manifest entry are dropped), no
  `app-shell` cache and no navigation route (offline does not work there); its
  only route is a `NetworkOnly` pass-through for `/api/*` (Workbox refuses a worker
  with nothing to do). `_headers` sets `Cache-Control: no-cache` for every path.
  At start the page deletes `workbox-precache-*` and `app-shell` caches that an
  older build left behind (`deleteUnusedCaches` in `src/lib/pwa.ts`); the worker
  never reads them. On `main` Workbox cleans its own precache.
  `_headers` is generated at build time (`vite.config.ts`), there is no
  `public/_headers`.
- Recovering a browser stuck on an old build (only needed for installs older
  than `sw-activate.js` that never got a new worker): DevTools -> Application ->
  Service workers -> Unregister, then Storage -> Clear site data, reload.

## Deployment (Cloudflare Workers, static assets + API proxy)

`wrangler.jsonc` serves `dist/` with `not_found_handling:
"single-page-application"`, so deep links like `/trips?sort=name` work, and
runs `worker/index.ts` first for `/api/*` (see "API proxy").
One Worker per environment (wrangler environments):

| Branch | Worker | URL |
| --- | --- | --- |
| `main` | `tuttitrip-frontend` | https://tuttitrip.gburek.app |
| `develop` | `tuttitrip-frontend-develop` | https://tuttitrip-develop.gburek.app |
| PR from any other branch | `tuttitrip-preview-<slug>` (`--env preview --name ...`, slug max 45) | `https://tuttitrip-preview-<slug>.gburek.app` |

`.github/workflows/frontend-ci.yml`, on `runs-on: [self-hosted, hackathon]`:
One run per commit: `pull_request` for branches, `push` only for main and
develop; a newer commit on a PR cancels its unfinished run (main/develop runs
are never cancelled). `verify` (install, `biome ci`, resolve API + `api:sync`,
`tsc -b`, `test:arch`, unit tests) and `build` (install, resolve API +
`api:sync`, build) run in parallel. `deploy` (needs both) = pushes to main/develop deploy their Worker;
pull requests deploy their preview Worker only when the org variable
`PREVIEW_DEPLOYS` is `true` or the PR has the label `preview` (otherwise the
`build` job summary says so), and upsert one PR comment (marker
`<!-- tuttitrip-preview -->`, edited in place, never duplicated). Each deploy
ends with a smoke test of `/`, a deep link and `/api/v1/health/live` through
the proxy (skipped for a preview whose backend did not answer).

**Custom domains are never taken by force.** Without a TTY, `wrangler deploy`
silently overrides conflicting DNS records, so CI first runs
`scripts/check-custom-domain.mjs <worker> <hostname>` (the same changeset
wrangler uses) and stops if the hostname has a DNS record or Custom Domain
that belongs to something else. The two Workers were bootstrapped without
routes and their domains attached with `override_existing_dns_record: false`;
a new environment needs the same treatment before its first CI deploy.

**Previews.** Cloudflare preview aliases (`versions upload --preview-alias`)
cannot be deleted, so every PR gets its own Worker. Its Custom Domain
`tuttitrip-preview-<slug>.gburek.app` is attached by
`scripts/attach-domain.mjs` with `override_existing_dns_record: false`
(workers.dev is not used: on this account it sits behind Cloudflare Access).
Previews call the API through their own `/api` proxy, so they need no CORS
entry in the backend.

**Preview cleanup.**
`scripts/cleanup-previews.mjs` lists Workers named `tuttitrip-preview-*`,
compares them with `git ls-remote --heads origin` (slugified) and deletes the
ones whose branch is gone, detaching their Custom Domains first. It only ever matches `^tuttitrip-preview-[a-z0-9-]+$`,
so the main/develop Workers and anything else in the account are never touched.
It runs after every deploy, when `delete-merged-branch.yml` dispatches
`frontend-cleanup.yml` after a merge, and on the GitHub `delete` event (a
branch deleted by hand), which also rewrites the PR's preview comment to
"Podgląd usunięty".

Secrets and variables (GitHub Actions): secret `CLOUDFLARE_API_TOKEN` (Workers
Scripts:Edit, Account Workers subdomain read, Zone Workers Routes:Edit and
DNS:Edit for gburek.app); variables `CLOUDFLARE_ACCOUNT_ID`, `AUTH0_DOMAIN`,
`AUTH0_CLIENT_ID`, `AUTH0_AUDIENCE`. Without the token the deploy job is
skipped with a warning and `checks` stays green.

## Workflows

### feature

1. Claim the issue and create a worktree as described in "Praca agentów nad issues"
   (`feature/<issue>-<short-description>` from `origin/develop`, in `~/Documents/GitHub/worktrees/tuttitrip/`).
2. Backend endpoint changed? `pnpm api:sync --url https://tuttitrip-api-<slug>.gburek.app/api/v1/openapi.json`
   (or the local backend) and commit `src/api/schema.d.ts`.
3. Build in this order: **API hooks** (`api/queries/`, `hooks/`) -> **UI
   components** (`components/<feature>/`) -> **view** (`views/`) -> **route**
   (`loaders/<feature>.ts` + `routes/<feature>.ts`). The `new-feature` skill
   scaffolds this.
4. New UI? Follow "UI: design system i impeccable", run the `impeccable-review` skill and fix
   what it finds.
5. Smoke test on the preview, subagent review, smoke test again, then the PR (see "Praca agentów nad issues").

### verify (before every commit)

```bash
pnpm biome check --write . && pnpm tsc -b && pnpm test:arch
```

### pr

Use the `open-pr` skill: PR into `develop` (`develop` into `main` for
releases) with a structured description (what and why, list of changes, how to
test, screenshots of desktop and mobile for UI changes, link to the preview
from the bot comment). After a merge the `Delete merged branch` workflow
deletes the head branch and starts `frontend-cleanup.yml`, which deletes the
preview. `main` and `develop` are never deleted, so release PRs go straight
from `develop`.

Branch protection for `main` and `develop` (PR required, `verify` and `build` must pass,
no force-push or deletion) is **not active**: GitHub refuses branch protection
and rulesets on private repos of a free organization ("Upgrade to GitHub Pro or
make this repository public"). Until the plan changes, treat these rules as a
team convention: never push to `main`/`develop` directly, never force-push.
GitHub's "Automatically delete head branches" is off: without protection it
deleted `develop` after every release PR (`develop` -> `main`). The shared
`Delete merged branch` workflow (`.github/workflows/delete-merged-branch.yml`,
logic in the org `.github` repo) deletes merged branches instead and skips
`main`, `develop`, forks, PRs closed without a merge and branches that are the
base of another open PR. If `develop` disappears anyway (deleted by hand),
`frontend-cleanup.yml` recreates it at `main` as a safety net.

No AI attribution anywhere: no `Co-Authored-By` trailers for tools, no
"generated with" lines in commits, PRs or comments.

## UI: design system i impeccable

- Każda zmiana interfejsu bezwzględnie stosuje skill `tuttitrip-design-system`
  (`.claude/skills/tuttitrip-design-system`). Przed pracą przeczytaj jego `README.md`, README użytych
  komponentów (`components/<Nazwa>/README.md`, podgląd `preview.html`) i wzorcowy ekran
  (`components/Screen*`). Tokeny tylko z `src/styles/theme.css` (wierna kopia `theme.css` ze skilla,
  nie edytuj jej ręcznie, tylko podmieniaj przy zmianie skilla), kroje z `src/styles/fonts`, ikony z
  `@keyline-icons/react`, teksty ze słownika UI w README skilla, w obu językach.
- Każdy nowy albo zmieniony ekran przechodzi przez impeccable (skill `impeccable-review`): critique i
  audit, a przed PR polish. Szczególnie używaj zdolności do usuwania AI slopu: detektora wzorców
  (`/impeccable hooks on` uruchamia go po każdej edycji UI), `distill` i `quieter` dla przeładowanych
  ekranów, `clarify` dla tekstów. Znalezione problemy poprawiasz przed review subagenta.
- Efekty zakazane w README skilla i w `DESIGN.md` (Aurora, Beams, Sparkles, gradientowy tekst, karty 3D,
  szkło, cienie na kartkach w spoczynku, karty w kartach, emoji) są zakazane także wtedy, gdy przychodzą
  z rejestru.
- Makiety ekranów z pitch decku są w `docs/mocks` (`pitch-deck.html`, lista w `docs/mocks/README.md`). To odniesienie wizualne, a design system i `DESIGN.md` mają pierwszeństwo.
- Komponent z rejestru (`@react-bits`, `@aceternity`, `@shadcn-space`) przepinasz na nasze tokeny,
  kroje i ikony Keyline, zanim go zacommitujesz.
- `PRODUCT.md` i `DESIGN.md` to kontekst impeccable. Gdy zmienia się design system, podmień
  `src/styles/theme.css` i fonty ze skilla i odśwież `DESIGN.md` przez `/impeccable document`.

## Praca agentów nad issues

Nad backlogiem pracuje równolegle kilku agentów AI i ludzi. Te zasady pilnują, żeby nikt nie wchodził
innym w drogę i żeby każda funkcja przeszła ten sam proces. Dotyczą też ludzi.

1. Wybór issue. Bierzesz tylko issue z tablicy
   [TuttiTrip](https://github.com/orgs/HackYeah-TuttiTripTeam/projects/1) ze statusem Todo, bez etykiety
   `in-progress` i bez przypisanej osoby. Linia „Zależy od:” w opisie wymienia issues, które muszą być
   zmergowane do `develop`. Jeśli któreś nie jest, pracuj tylko na jego kontrakcie (np. stała odpowiedź z
   OpenAPI) i napisz to w komentarzu. Kolejność: najpierw P0, potem P1, w obrębie milestone'u.
2. Zajęcie issue, zanim napiszesz kod:
   - `gh issue edit <nr> --add-label in-progress`,
   - Status na tablicy: In Progress,
   - komentarz „Start” z nazwą gałęzi, ścieżką worktree i krótkim planem (pliki, które zmienisz).
   Etykieta `in-progress` znaczy „zajęte”. Nie bierz takiego issue i nie zmieniaj go bez zgody zespołu.
3. Worktree i gałąź. Nigdy nie pracuj w głównym klonie repozytorium. Jedno issue to jeden worktree, jedna
   gałąź i jeden PR do `develop`:

   ```bash
   git -C ~/Documents/GitHub/<repo> fetch origin
   git -C ~/Documents/GitHub/<repo> worktree add -b feature/<nr>-<krotka-nazwa> \
     ~/Documents/GitHub/worktrees/tuttitrip/<repo>-<nr>-<krotka-nazwa> origin/develop
   ```

   (`<repo>` to `tuttitrip-backend`, `tuttitrip-worker` albo `tuttitrip-frontend`; w repo zbiorczym
   `tuttitrip` gałąź bierzesz z `origin/main`.)
4. Komentarze ze statusem w issue po każdym etapie: plan, implementacja z testami, wynik smoke testu,
   wynik review subagenta, link do PR. Krótko: co zrobione, co dalej, co blokuje. Gdy utkniesz: etykieta
   `blocked` i komentarz z powodem i tym, czego potrzebujesz.
5. Pliki wspólne, w których łatwo o konflikt, zmieniaj małymi krokami i przed PR rób
   `git fetch origin && git rebase origin/develop`:
   - `src/api/schema.d.ts` tylko z `pnpm api:sync`, nigdy ręcznie (przy konflikcie wygeneruj od nowa),
   - `src/routeTree.gen.ts` (generowany), `src/styles/*` (tylko z skilla design systemu),
   - `components/ui/*`, `components/shared/*` i pliki z tekstami interfejsu (PL i EN).
6. Smoke test jest obowiązkowy dla KAŻDEGO zrealizowanego feature'a. Podglądy gałęzi są domyślnie wyłączone (zmienna organizacji `PREVIEW_DEPLOYS=false`, oszczędzamy
   moc obliczeniową): develop i main wdrażają się zawsze, gałąź tylko z etykietą `preview` na PR (albo gdy
   zmienna ma wartość `true`). Użyj etykiety wyłącznie, gdy żywy podgląd jest niezbędny; w pozostałych
   przypadkach smoke test robisz lokalnie, a po merge'u sprawdzasz develop. Pominięty podgląd zostawia
   w podsumowaniu joba jedną linię "Preview disabled (PREVIEW_DEPLOYS=false); add label `preview` to deploy".
   CI sprawdza tylko lint, typy, testy jednostkowe i testy architektury (job `verify`), a `vite build`
   robi tylko wtedy, gdy będzie wdrożenie (develop, main, etykieta `preview`). Testy integracyjne
   (`*.int.test.*`, dziś `scripts/dist.int.test.mjs` i `scripts/pwa-build.int.test.mjs`, czyli pełne buildy produkcyjne) nie
   chodzą na CI, więc przed oznaczeniem PR jako gotowego uruchom lokalnie `pnpm verify`,
   `pnpm test:integration` i `pnpm build` (to one łapią błędy pluginów, Rollupa i PWA, bo zwykły `vite build` na PR bez etykiety `preview` nie chodzi na CI); wynik wpisz w komentarzu ze smoke testem.
   Nowy wolny test (pełny build, wiele sekund) nazwij `*.int.test.*`; szybkie testy
   przepływów w jsdom z MSW zostają jednostkowe. Przejdź scenariusz z kryteriów akceptacji issue:
   - lokalnie: `pnpm dev:mock` (scenariusze: puste, błąd, tylko do odczytu, zatwierdzenie, offline) i/albo
     `pnpm dev` z lokalnym proxy `/api` do API develop (`VITE_API_URL`),
   - tylko gdy podgląd jest niezbędny: otwórz szkic PR (`gh pr create --draft`), dodaj etykietę `preview`;
     adres `https://tuttitrip-preview-<slug>.gburek.app` jest w komentarzu bota,
   - przejdź scenariusz na telefonie (widok 390x844) i na desktopie, w motywie jasnym i ciemnym, po
     polsku i po angielsku (skill `claude-in-chrome` albo ręcznie); zrzuty dołącz do komentarza.
   Wynik (kroki, odpowiedzi albo zrzuty ekranu) wpisz w komentarzu w issue. Bez zielonego smoke testu
   nie ma PR.
7. Review subagenta. Po zielonym smoke teście uruchom subagenta-recenzenta z diffem gałęzi, treścią
   issue i story źródłową. Sprawdza:
   - uproszczenie kodu i zbędną złożoność (skille `simplify` i `ponytail-review`),
   - złożoność logiki,
   - poprawność biznesową względem story, słownika z dokumentu architektonicznego i, przy logice
     planowania, specyfikacji algorytmu (`docs/algorytm.md` w tuttitrip-backend).
   Popraw to, co znalazł, i **powtórz smoke test**. Wynik review i drugiego smoke testu wpisz w komentarzu.
8. PR. Dopiero po tym oznacz szkic PR jako gotowy (`gh pr ready`), opis według skilla `open-pr` (`Closes #<nr>`) i ustaw Status: In
   Review. Po merge'u zdejmij `in-progress`, usuń worktree
   (`git -C ~/Documents/GitHub/<repo> worktree remove <ścieżka>`); zamknij issue ręcznie
   (`gh issue close <nr> --comment "Zmergowane w #<PR>"`), bo `Closes` zamyka issue dopiero po merge'u
   do `main` (wydanie). Status: Done.

## Zgłoszenia, PR i wydania

Zasady są wspólne dla całej organizacji, pełny opis jest w
[CONTRIBUTING.md](https://github.com/HackYeah-TuttiTripTeam/.github/blob/main/CONTRIBUTING.md).

Zgłoszenia (issues):

- Tytuł zaczyna się od `feat:`, `docs:`, `chore:` albo `bug:`, opcjonalnie
  z zakresem, np. `feat(frontend): Eksport planu do PDF`. Regex:
  `^(feat|docs|chore|bug)(\([a-z0-9-]+\))?: \S.{3,}`.
- Treść ma sekcje `###` i żadna wymagana nie może być pusta. W `feat`,
  `docs` i `chore` są to Opis, Dlaczego, Kryteria akceptacji, Definition of
  Done i Obszar (w `feat` można dodać Poza zakresem). W `bug` są to Opis,
  Kroki do odtworzenia, Oczekiwane zachowanie, Faktyczne zachowanie,
  Środowisko, Dlaczego, Kryteria akceptacji, Definition of Done i Obszar.
- `.github/workflows/issue-format.yml` sprawdza każde nowe i edytowane
  zgłoszenie. Złe zamyka jako "not planned", dodaje etykietę
  `invalid-format` i pisze w komentarzu, co poprawić. Po poprawce otwiera je
  ponownie. Ustawia też etykietę `type:*`.
- Z terminala (skill `new-issue` przygotuje treść i założy zgłoszenie):

  ```bash
  gh issue create --title "feat(frontend): Eksport planu do PDF" --body-file - <<'MD'
  ### Opis
  Organizator pobiera gotowy plan jako PDF.

  ### Dlaczego
  W podróży plan musi być dostępny offline, a nie każdy instaluje PWA.

  ### Kryteria akceptacji
  - [ ] Given gotowy plan, When kliknę "Pobierz PDF", Then dostanę plik z planem dzień po dniu

  ### Definition of Done
  - [ ] CI zielone (lint, typy, testy jednostkowe, testy architektury)
  - [ ] Lokalnie przeszły testy integracyjne i smoke test (`pnpm test:integration`, `pnpm build`)
  - [ ] PR zmergowany do `develop` i sprawdzony na wdrożeniu develop

  ### Obszar
  Frontend
  MD
  ```

Pull requesty i merge:

- Tytuł PR: `feat:`, `docs:`, `chore:` albo `bugfix:` (w PR nie `bug:`),
  opcjonalnie z zakresem. PR wydania `develop` -> `main` ma tytuł
  `release: opis`.
- Opis po polsku według szablonu: `## Co i dlaczego`, `## Powiązane issue`
  (`Closes #12` albo `Refs #12`; w `docs` i `chore` może być `brak`),
  `## Lista zmian`, `## Jak przetestować`, `## Zrzuty ekranu`,
  `## Checklista`. Gotowy szablon ma skill `open-pr`.
- `.github/workflows/pr-format.yml` oznacza check na czerwono i komentuje,
  gdy tytuł albo sekcje są złe. Bez ochrony gałęzi (darmowy plan) czerwony
  check nie blokuje merge'a, więc nie mergujemy z czerwonym.
- PR do `develop` mergujemy przez "Squash and merge" (tytuł PR staje się
  commitem). PR wydania do `main` mergujemy przez "Create a merge commit".
  GitHub nie pozwala ustawić metody osobno dla gałęzi, więc to zasada
  zespołu.

Wydania:

- `.github/workflows/release-notes.yml` (Release Drafter, konfiguracja w
  repozytorium `.github`) nadaje PR etykietę `type:*` według prefiksu tytułu
  i po każdym merge'u do `develop` aktualizuje szkic następnego wydania w
  GitHub Releases.
- Merge PR `release:` do `main` publikuje szkic i zakłada tag `vX.Y.Z`.
  `feat` podnosi wersję minor, pozostałe typy patch, pierwsze wydanie to
  `v0.1.0`. Nie prowadzimy pliku CHANGELOG.md.

## Powiadomienia (Discord)

- `.github/workflows/discord-notify.yml` wysyła na Discord zespołu wynik
  każdego innego workflow tego repozytorium (`workflow_run: completed`) przez
  wspólny `discord-notify.yml` z repozytorium
  [`.github`](https://github.com/HackYeah-TuttiTripTeam/.github). GitHub
  uruchamia go tylko z kopii na `main`, ta na `develop` jest dla porządku.
- Nowy albo przemianowany workflow trzeba dopisać po nazwie (`name:`) do
  listy `workflows:` w tym pliku.
- Zasady szumu:
  - `skipped` nie idzie wcale,
  - `Issue format`, `PR format`, `Delete merged branch`, `Release notes` i sprzątanie (`Frontend preview cleanup`) piszą tylko przy niepowodzeniu,
  - sukces na `main` i `develop` to pełna wiadomość z adresem wdrożenia (https://tuttitrip.gburek.app, https://tuttitrip-develop.gburek.app),
  - sukces na innej gałęzi i anulowanie to jedna linia (dla PR z adresem podglądu `https://tuttitrip-preview-<slug>.gburek.app`),
  - błąd to zawsze pełna wiadomość z listą nieudanych jobów.
- Zmiany w projekcie #1 oraz nowe, zamknięte i scalone issue i PR wysyła
  Worker `tuttitrip-discord-relay` z webhooka organizacji (kod w
  `.github/discord-relay`), nie ten workflow.
- Webhook to sekret repozytorium `DISCORD_WEBHOOK_URL` (sekret organizacji
  nie działa: na darmowym planie nie widzą go repozytoria prywatne). Rotacja:
  nowy webhook w Discordzie, `gh secret set DISCORD_WEBHOOK_URL` w czterech
  repozytoriach i `wrangler secret put DISCORD_WEBHOOK_URL` w Workerze.
  Szczegóły w
  [CONTRIBUTING.md](https://github.com/HackYeah-TuttiTripTeam/.github/blob/main/CONTRIBUTING.md#powiadomienia-discord).
  URL-a webhooka nie wklejamy nigdzie (issue, PR, logi, czat).

## Project skills (`.claude/skills/`)

- `new-feature`: scaffold api query -> hooks -> components -> view -> loader + route.
- `impeccable-review`: AI-slop, contrast and hierarchy audit via `impeccable`.
- `open-pr`: branch checks, verify, structured PR description.
- `new-issue`: drafts an issue in the required format and creates it with `gh`.
- `tuttitrip-design-system`: the TuttiTrip design system (tokens, fonts, Keyline
  icons, `tt-*` components, screens, UI glossary). Read it before any UI work.
- `humanizer`: vendored from github.com/blader/humanizer (MIT, Siqi Chen);
  run it over README and other prose for people.

## Next steps (not done yet)

- Capacitor wrapper for app-store builds (optional; the PWA covers install today).
- Server-side sorting/filtering once the API supports query params (then add
  `loaderDeps` and pass the search to the query).
