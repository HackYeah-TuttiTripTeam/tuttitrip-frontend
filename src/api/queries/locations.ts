import { $api, fetchClient, type Schemas } from '@/api/client'

export type MemberLocation = Schemas['LocationRead']
export type LocationConsent = Schemas['ConsentRead']
export type PositionUpdate = Schemas['PositionUpdate']

/** Largest page the API gives; a family trip has far fewer people sharing. */
const LOCATIONS_PAGE_SIZE = 100

/** The positions members share right now (only valid ones, newest update first). */
export const locationsQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/locations', {
    params: { path: { trip_id: tripId }, query: { size: LOCATIONS_PAGE_SIZE, dir: 'desc' } },
  })

export const consentQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/locations/me/consent', {
    params: { path: { trip_id: tripId } },
  })

/** The caller's latest position. Refused (403) without a live consent, and not stored then. */
export async function sendPosition(tripId: string, position: PositionUpdate): Promise<void> {
  await fetchClient.PUT('/api/v1/trips/{trip_id}/locations/me', {
    params: { path: { trip_id: tripId } },
    body: position,
  })
}

/** Stops sharing now: consent and last position are deleted on the server. */
export async function withdrawSharing(tripId: string): Promise<void> {
  await fetchClient.DELETE('/api/v1/trips/{trip_id}/locations/me', {
    params: { path: { trip_id: tripId } },
  })
}
