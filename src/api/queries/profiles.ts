import { $api, type Schemas } from '@/api/client'

export type Profile = Schemas['ProfileRead']
export type ProfileCreate = Schemas['ProfileCreate']
export type ProfileUpdate = Schemas['ProfileUpdate']
export type AgeGroup = Schemas['AgeGroup']

export const profilesQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/profiles', {
    params: { path: { trip_id: tripId } },
  })
