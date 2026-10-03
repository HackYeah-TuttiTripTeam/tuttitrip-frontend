import { z } from 'zod'
import { canCallProtectedApi } from '@/api/client'
import { tripsQueryOptions } from '@/api/queries/trips'
import type { RouterContext } from './router-context'

export const TRIP_SORT_KEYS = ['created_at', 'name', 'destination'] as const
export type TripSortKey = (typeof TRIP_SORT_KEYS)[number]
export type SortDirection = 'asc' | 'desc'

/** Values left out of the URL (see stripSearchParams in routes/trips.ts). */
export const tripsSearchDefaults = {
  q: '',
  sort: 'created_at',
  dir: 'desc',
} as const

/**
 * /trips?q=&sort=&dir= — the URL is the single source of truth for filtering
 * and sorting. Bad values fall back to defaults instead of erroring.
 */
export const tripsSearchSchema = z.object({
  // TanStack Router parses ?q=2026 as a number, so accept both.
  q: z
    .union([z.string(), z.number()])
    .transform((value) => String(value).slice(0, 100))
    .default(tripsSearchDefaults.q)
    .catch(tripsSearchDefaults.q),
  sort: z.enum(TRIP_SORT_KEYS).default(tripsSearchDefaults.sort).catch(tripsSearchDefaults.sort),
  dir: z.enum(['asc', 'desc']).default(tripsSearchDefaults.dir).catch(tripsSearchDefaults.dir),
})

export type TripsSearch = z.output<typeof tripsSearchSchema>

/** Starts fetching trips before the view renders, when we already hold a token. */
export function loadTrips({ context }: { context: RouterContext }) {
  if (!canCallProtectedApi()) return
  return context.queryClient.prefetchQuery(tripsQueryOptions())
}
