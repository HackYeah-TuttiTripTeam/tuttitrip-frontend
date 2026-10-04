import { z } from 'zod'
import { canCallProtectedApi, type Schemas } from '@/api/client'
import { type TripsSearch as ApiSearch, tripsQueryOptions } from '@/api/queries/trips'
import { createListSearchSchema, textFilter } from './list-search'
import type { RouterContext } from './router-context'

export const TRIP_SORT_KEYS = ['created_at', 'start_date', 'name'] as const
export type TripSortKey = (typeof TRIP_SORT_KEYS)[number]
export type TripKind = Schemas['TripRead']['kind']
export type TripRole = Schemas['TripRole']
export type TripWhen = Schemas['TripWhen']
export type TripStatus = Schemas['MemberStatus']

/** Runtime lists for Zod; `satisfies` + the check below keep them equal to the API's literals. */
export const TRIP_KINDS = ['trip', 'outing'] as const satisfies readonly TripKind[]
export const TRIP_ROLES = ['host', 'co_host', 'member'] as const satisfies readonly TripRole[]
export const TRIP_WHEN = ['upcoming', 'past'] as const satisfies readonly TripWhen[]
export const TRIP_STATUSES = ['confirmed', 'pending'] as const satisfies readonly TripStatus[]
const _allKinds: Exclude<TripKind, (typeof TRIP_KINDS)[number]> extends never ? true : never = true
const _allRoles: Exclude<TripRole, (typeof TRIP_ROLES)[number]> extends never ? true : never = true
void [_allKinds, _allRoles]

const optional = <T extends z.ZodType>(type: T) => type.optional().catch(undefined)
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/**
 * /trips?q=&city=&kind=&when=&status=&role=&start_from=&start_to=&sort=&dir=&page=&size= — the URL is the single
 * source of truth; the API filters, sorts and pages. Several roles are written the way TanStack
 * Router does it for arrays (`role=["host","member"]`); a single `role=host` is read too.
 * `start_to` before `start_from` is dropped here, so the URL, the filter bar and the request agree.
 */
const { schema, defaults } = createListSearchSchema({
  sortKeys: TRIP_SORT_KEYS,
  defaultSort: 'created_at',
  defaultDir: 'desc',
  filters: {
    q: textFilter(),
    city: optional(z.string().max(100)),
    kind: optional(z.enum(TRIP_KINDS)),
    when: optional(z.enum(TRIP_WHEN)),
    status: optional(z.enum(TRIP_STATUSES)),
    start_from: optional(day),
    start_to: optional(day),
    role: z
      .preprocess(
        (value) => (typeof value === 'string' ? [value] : value),
        z.array(z.enum(TRIP_ROLES)),
      )
      .default([])
      .catch([]),
  },
})

export const tripsSearchSchema = schema.transform((search) =>
  search.start_from && search.start_to && search.start_to < search.start_from
    ? { ...search, start_to: undefined }
    : search,
)
export const tripsSearchDefaults = defaults
export type TripsSearch = z.output<typeof tripsSearchSchema>

/** The filters of the list without sort and paging. */
export const tripFilterDefaults = {
  q: '',
  city: undefined,
  kind: undefined,
  when: undefined,
  status: undefined,
  start_from: undefined,
  start_to: undefined,
  role: [],
} satisfies Partial<TripsSearch>

/** Starts fetching the page the URL asks for before the view renders, when we hold a token. */
export function loadTrips({ context, deps }: { context: RouterContext; deps: ApiSearch }) {
  if (!canCallProtectedApi()) return
  return context.queryClient.prefetchQuery(tripsQueryOptions(deps))
}
