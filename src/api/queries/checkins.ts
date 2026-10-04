import { $api, type Schemas } from '@/api/client'

export type Checkin = Schemas['CheckinRead']
export type CheckinUpdate = Schemas['CheckinUpdate']
export type CheckinSort = Schemas['CheckinSort']
export type SortDir = Schemas['SortDir']

export interface CheckinsQuery {
  page: number
  size: number
  sort: CheckinSort
  dir: SortDir
  /** Part of the accommodation name; empty means no filter. */
  accommodation: string
}

/** One page of the group's check-ins (where everyone stays, room numbers). */
export const checkinsQueryOptions = (tripId: string, query: CheckinsQuery) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/checkins', {
    params: {
      path: { trip_id: tripId },
      query: { ...query, accommodation: query.accommodation || undefined },
    },
  })

/** Prefix of every check-in page of a trip, to invalidate them all after a write. */
export const checkinsKey = (tripId: string) =>
  ['get', '/api/v1/trips/{trip_id}/checkins', { params: { path: { trip_id: tripId } } }] as const
