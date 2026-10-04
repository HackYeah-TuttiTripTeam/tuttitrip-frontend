import { $api, type Schemas } from '@/api/client'

export type Veto = Schemas['VetoRead']
export type Rating = Schemas['RatingRead']
export type RatingValue = Schemas['RatingValue']
export type ReasonCode = Schemas['ReasonCode']

/** The vetoes in force on a trip (revoked ones are left out by the API). */
export const vetoesQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/vetoes', {
    params: { path: { trip_id: tripId } },
  })

/** Every rating of a trip; the caller's own are picked by profile id. */
export const ratingsQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/ratings', {
    params: { path: { trip_id: tripId } },
  })
