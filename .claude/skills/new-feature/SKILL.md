---
name: new-feature
description: Scaffold a TuttiTrip frontend feature end to end (API query options, hooks, presentational components, view, loader with URL search params, route) following AGENTS.md. Use when adding a new page, screen or data-backed feature to tuttitrip-frontend.
---

# New feature

Builds a feature in the order AGENTS.md prescribes: API hooks -> UI components -> view -> route.
The trips feature is the reference implementation; open its files side by side while you work.

## 0. Branch and contract

1. `git switch develop && git pull && git switch -c feature/<short-description>`.
2. If the backend endpoint is new or changed, sync the contract from the backend branch
   (or local backend) and commit it:
   `pnpm api:sync --url https://tuttitrip-api-<slug>.gburek.app/api/v1/openapi.json`.
3. Find the endpoint in `src/api/schema.d.ts` (`paths['/api/v1/x']`) and its DTOs (`components['schemas']`).

## 1. API layer: `src/api/queries/<feature>.ts`

```ts
import { $api, type Schemas } from '@/api/client'
export type Thing = Schemas['ThingRead']
export const thingsQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/things', { params: { path: { trip_id: tripId } } })
```

Never call `fetch` directly; `$api` adds the Auth0 bearer token.

## 2. Hooks: `src/hooks/use-<feature>.ts` (`.ts`, no JSX)

- Read: `useQuery({ ...thingsQueryOptions(id), enabled })`; derive filtered/sorted data from the
  search params passed in as an argument.
- Write: `$api.useMutation('post', '/api/v1/x', { onSuccess: () => queryClient.invalidateQueries({ queryKey: thingsQueryOptions(id).queryKey }) })`.
- Map errors with `classifyApiError` from `@/api/errors`.

## 3. Components: `src/components/<feature>/*.tsx`

Presentational only: props in, callbacks out. No hooks from `@/hooks`, no stores, no `$api`.
Type-only imports of API types are fine. Use shadcn parts from `@/components/ui`
(add more with `pnpm dlx shadcn@latest add <name>` or a namespaced registry item).
Tables use TanStack Table v9 (`tableFeatures`, `useTable`, `table.FlexRender`), see
`components/trips/trips-table.tsx`. Forms use react-hook-form + Zod, see
`components/trips/create-trip-form.tsx`. Colors only through semantic tokens.

## 4. Loader and search params: `src/loaders/<feature>.ts`

```ts
export const thingsSearchDefaults = { q: '', sort: 'name', dir: 'asc' } as const
export const thingsSearchSchema = z.object({
  q: z.string().default('').catch(''),
  sort: z.enum(['name', 'created_at']).default('name').catch('name'),
  dir: z.enum(['asc', 'desc']).default('asc').catch('asc'),
})
export function loadThings({ context, params }: { context: RouterContext; params: { tripId: string } }) {
  if (!canCallProtectedApi()) return
  return context.queryClient.prefetchQuery(thingsQueryOptions(params.tripId))
}
```

Every sort/filter control must map to a search param here.

## 5. View: `src/views/<feature>-view.tsx`

```ts
const route = getRouteApi('/trips/$tripId/things')
const search = route.useSearch()
const navigate = route.useNavigate()
const setSort = (sort, dir) => navigate({ search: (prev) => ({ ...prev, sort, dir }), replace: true })
```

Compose hooks and components; render loading (skeleton), empty, error, signed-out states with
`StatusMessage`. Forms open in `ResponsiveModal` (drawer on phones). Do not import other views.

## 6. Route: `src/routes/<path>.ts` (`.ts`, wiring only)

```ts
export const Route = createFileRoute('/trips/$tripId/things')({
  validateSearch: thingsSearchSchema,
  search: { middlewares: [stripSearchParams(thingsSearchDefaults)] },
  loader: loadThings,
  component: ThingsView,
})
```

`pnpm dev` regenerates `src/routeTree.gen.ts`; commit it.

## 7. Finish

1. `pnpm biome check --write . && pnpm tsc -b && pnpm test:arch && pnpm build`
2. Run the `impeccable-review` skill on the new view and components.
3. Open the PR with the `open-pr` skill.
