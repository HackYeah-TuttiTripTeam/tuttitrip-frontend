import type { Trip } from '@/api/queries/trips'
import type { SortDirection } from '@/loaders/list-search'
import type { TripKind, TripRole, TripSortKey } from '@/loaders/trips'
import { m } from '@/paraglide/messages'

export type { SortDirection, Trip, TripKind, TripRole, TripSortKey }

/** Message functions, so the label is resolved in the language active at render time. */
export const TRIP_SORT_LABELS: Record<TripSortKey, () => string> = {
  created_at: m.trip_sort_created_at,
  start_date: m.trip_sort_start_date,
  name: m.trip_sort_name,
}

export const TRIP_ROLE_LABELS: Record<TripRole, () => string> = {
  host: m.trip_role_host,
  co_host: m.trip_role_co_host,
  member: m.trip_role_member,
}

export const TRIP_KIND_LABELS: Record<TripKind, () => string> = {
  trip: m.trip_kind_trip,
  outing: m.trip_kind_outing,
}
