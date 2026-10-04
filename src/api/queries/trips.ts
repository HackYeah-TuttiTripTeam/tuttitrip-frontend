import { $api, type Schemas } from '@/api/client'
import { type Page, pagedQueryOptions } from './paged'

export type Trip = Schemas['TripRead']
export type TripsPage = Page<Trip>
export type TripCreate = Schemas['TripCreate']
export type TripUpdate = Schemas['TripUpdate']

/** Prefix of every cached page of the list, for invalidation after a write. */
export const tripsListKey = ['get', '/api/v1/trips'] as const

/** What the list view sends: the validated URL search (see loaders/trips.ts). */
export interface TripsSearch {
  page: number
  size: number
  sort: Schemas['TripSort']
  dir: Schemas['SortDir']
  q: string
  city?: string | undefined
  kind?: 'trip' | 'outing' | undefined
  when?: Schemas['TripWhen'] | undefined
  status?: Schemas['MemberStatus'] | undefined
  start_from?: string | undefined
  start_to?: string | undefined
  role: Schemas['TripRole'][]
}

/** The URL search goes to the API as it is; empty filters are left out. */
export function tripsApiQuery({ q, role, ...rest }: TripsSearch) {
  return { ...rest, q: q.trim() || undefined, role: role.length > 0 ? role : undefined }
}

export const tripsQueryOptions = (search: TripsSearch) =>
  pagedQueryOptions(
    $api.queryOptions('get', '/api/v1/trips', { params: { query: tripsApiQuery(search) } }),
  )

export const tripQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}', { params: { path: { trip_id: tripId } } })
