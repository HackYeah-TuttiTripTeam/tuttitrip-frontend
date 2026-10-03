import { z } from 'zod'
import { canCallProtectedApi } from '@/api/client'
import { tripQueryOptions } from '@/api/queries/trips'
import type { RouterContext } from './router-context'

export const TRIP_TABS = ['interview', 'people', 'plan'] as const
export type TripTab = (typeof TRIP_TABS)[number]

/** Values left out of the URL (see stripSearchParams in routes/trips_.$tripId.ts). */
export const tripSearchDefaults = { tab: 'interview' } as const satisfies { tab: TripTab }

/** /trips/$tripId?tab= — a bad tab falls back to the default instead of erroring. */
export const tripSearchSchema = z.object({
  tab: z.enum(TRIP_TABS).default(tripSearchDefaults.tab).catch(tripSearchDefaults.tab),
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
