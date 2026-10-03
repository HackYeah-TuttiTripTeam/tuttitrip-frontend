import { $api, type Schemas } from '@/api/client'

export type Trip = Schemas['TripRead']
export type TripCreate = Schemas['TripCreate']

export const tripsQueryOptions = () => $api.queryOptions('get', '/api/v1/trips')

export const tripQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}', { params: { path: { trip_id: tripId } } })

export type TripUpdate = Schemas['TripUpdate']
