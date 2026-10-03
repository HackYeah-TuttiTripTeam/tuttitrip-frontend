import type { Trip } from '@/api/queries/trips'
import type { SortDirection, TripSortKey } from '@/loaders/trips'

export type { SortDirection, Trip, TripSortKey }

export const TRIP_SORT_LABELS: Record<TripSortKey, string> = {
  created_at: 'Data utworzenia',
  name: 'Nazwa',
  destination: 'Cel podróży',
}
