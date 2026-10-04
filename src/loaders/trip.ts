import { z } from 'zod'
import { canCallProtectedApi } from '@/api/client'
import { tripQueryOptions } from '@/api/queries/trips'
import { DECISION_SORT_KEYS } from '@/lib/constants'
import { DECISION_KINDS } from '@/lib/decisions'
import { TRIP_TABS, type TripTab } from '@/lib/trip-tabs'
import { createListSearchSchema } from './list-search'
import type { RouterContext } from './router-context'

/** The decision log of the Plan tab is a list: page, size, sort, dir and a filter by kind. */
const { schema: decisionLogSchema, defaults: decisionLogDefaults } = createListSearchSchema({
  sortKeys: DECISION_SORT_KEYS,
  defaultSort: 'created_at',
  defaultDir: 'desc',
  filters: { decision: z.enum(DECISION_KINDS).optional().catch(undefined) },
})

/** Values left out of the URL (see stripSearchParams in routes/trips_.$tripId.ts). */
export const tripSearchDefaults = {
  tab: 'interview',
  ...decisionLogDefaults,
} as const satisfies { tab: TripTab }

/** The filters of the decision log without sort and paging. */
export const decisionLogFilterDefaults = { decision: undefined }

/**
 * /trips/$tripId?tab=&person=&offer=&page=&size=&sort=&dir=&decision= — a bad value falls back to the
 * default instead of erroring.
 */
export const tripSearchSchema = z.object({
  tab: z.enum(TRIP_TABS).default(tripSearchDefaults.tab).catch(tripSearchDefaults.tab),
  /** The open person of the Osoby tab (a profile id); a bad value shows the list. */
  person: z.uuid().optional().catch(undefined),
  /** The checked offer of the Noclegi tab, so a reload shows the same result. */
  offer: z.uuid().optional().catch(undefined),
  ...decisionLogSchema.shape,
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
