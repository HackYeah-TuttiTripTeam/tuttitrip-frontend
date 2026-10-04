import { $api, type Schemas } from '@/api/client'

export type Preferences = Schemas['PreferencesRead']
export type PreferencesWrite = Schemas['PreferencesWrite']
export type Constraints = Schemas['Constraints']
export type Diet = Schemas['Diet']
export type DietTag = Schemas['DietTag']
export type ImportancePool = Schemas['ImportancePool']
export type MinTag = Schemas['MinTag']
export type ExamplePlace = Schemas['ExamplePlace']
export type ExampleVerdict = Schemas['ExampleVerdict']
/** The interest taxonomy: the same tags places carry, so the planner can match them. */
export type InterestTag = Schemas['PlaceTag']

export const preferencesQueryOptions = (tripId: string, profileId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/profiles/{profile_id}/preferences', {
    params: { path: { trip_id: tripId, profile_id: profileId } },
  })
