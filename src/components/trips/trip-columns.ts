import type { Trip } from '@/api/queries/trips'
import type { SortDirection, TripSortKey } from '@/loaders/trips'
import { m } from '@/paraglide/messages'

export type { SortDirection, Trip, TripSortKey }

/** Message functions, so the label is resolved in the language active at render time. */
export const TRIP_SORT_LABELS: Record<TripSortKey, () => string> = {
  created_at: m.trip_sort_created_at,
  name: m.trip_sort_name,
  destination: m.trip_sort_destination,
}
