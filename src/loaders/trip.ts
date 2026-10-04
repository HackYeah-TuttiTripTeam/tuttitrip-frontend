import { z } from 'zod'
import { canCallProtectedApi } from '@/api/client'
import { tripQueryOptions } from '@/api/queries/trips'
import { TRIP_TABS, type TripTab } from '@/lib/trip-tabs'
import { expenseSectionSchema, expensesListDefaults, expensesListShape } from './expenses'
import type { RouterContext } from './router-context'

/** Values left out of the URL (see stripSearchParams in routes/trips_.$tripId.ts). */
export const tripSearchDefaults = {
  ...expensesListDefaults,
  tab: 'interview' satisfies TripTab,
  section: 'list',
} as const

/** /trips/$tripId?tab=&person=&section=&page=... (the last ones belong to the Wydatki tab, see loaders/expenses.ts) — a bad tab falls back to the default instead of erroring. */
export const tripSearchSchema = z.object({
  tab: z.enum(TRIP_TABS).default(tripSearchDefaults.tab).catch(tripSearchDefaults.tab),
  /** The open person of the Osoby tab (a profile id); a bad value shows the list. */
  person: z.uuid().optional().catch(undefined),
  section: expenseSectionSchema,
  ...expensesListShape,
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
