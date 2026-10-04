import { z } from 'zod'
import { canCallProtectedApi } from '@/api/client'
import { tripQueryOptions } from '@/api/queries/trips'
import type { VoteSummarySort } from '@/api/queries/vote-links'
import { TRIP_TABS, type TripTab } from '@/lib/trip-tabs'
import { VOTE_SOURCES, VOTE_SUMMARY_SORTS } from '@/lib/vote-constants'
import type { RouterContext } from './router-context'

/** Values left out of the URL (see stripSearchParams in routes/trips_.$tripId.ts). */
export const tripSearchDefaults = {
  tab: 'interview',
  vpage: 1,
  vsort: 'name',
} as const satisfies { tab: TripTab; vpage: number; vsort: VoteSummarySort }

/** /trips/$tripId?tab=&person=&vpage=&vsort=&vsource=&vveto= — a bad tab falls back to the default instead of erroring. */
export const tripSearchSchema = z.object({
  tab: z.enum(TRIP_TABS).default(tripSearchDefaults.tab).catch(tripSearchDefaults.tab),
  /** The open person of the Osoby tab (a profile id); a bad value shows the list. */
  person: z.uuid().optional().catch(undefined),
  /** The vote summary of the Osoby tab: page, sort, source filter and "only with a veto". */
  vpage: z.number().int().min(1).default(tripSearchDefaults.vpage).catch(tripSearchDefaults.vpage),
  vsort: z
    .enum(VOTE_SUMMARY_SORTS)
    .default(tripSearchDefaults.vsort)
    .catch(tripSearchDefaults.vsort),
  vsource: z.enum(VOTE_SOURCES).optional().catch(undefined),
  vveto: z.literal(true).optional().catch(undefined),
})

export type TripSearch = z.output<typeof tripSearchSchema>

/** Starts fetching the trip before the view renders, when we already hold a token. */
export function loadTrip({
  context,
  params,
}: {
  context: RouterContext
  params: { tripId: string }
}) {
  if (!canCallProtectedApi()) return
  // A failed prefetch (404, offline) is shown by the view, not thrown by the loader.
  return context.queryClient.prefetchQuery(tripQueryOptions(params.tripId))
}
