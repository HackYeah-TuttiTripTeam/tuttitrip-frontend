import { $api, type Schemas } from '@/api/client'
import { OFFER_POLL_MAX_READS, OFFER_POLL_MS } from '@/lib/constants'

export type Requirements = Schemas['RequirementsRead']
export type RequirementItem = Schemas['RequirementItem']
export type RequirementCheck = Schemas['RequirementCheck']
export type RequirementStatus = Schemas['RequirementStatus']
export type UnconfirmedReason = Schemas['UnconfirmedReason']
export type Offer = Schemas['OfferRead']
export type SearchLinks = Schemas['SearchLinksRead']
export type SearchLink = Schemas['SearchLinkRead']
export type Platform = Schemas['Platform']

/** Prefix of every cached offer: a changed requirement makes their checks stale, so they are read again. */
export const offersKey = ['get', '/api/v1/trips/{trip_id}/accommodation/offers/{offer_id}'] as const

export const requirementsQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/accommodation/requirements', {
    params: { path: { trip_id: tripId } },
  })

/** A check runs in the worker: the offer is read again every few seconds until it is no longer pending. */
export const offerQueryOptions = (tripId: string, offerId: string) => ({
  ...$api.queryOptions('get', '/api/v1/trips/{trip_id}/accommodation/offers/{offer_id}', {
    params: { path: { trip_id: tripId, offer_id: offerId } },
  }),
  // A check that stays pending for a minute is left alone; the screen then offers "check again".
  refetchInterval: (query: { state: { data: Offer | undefined; dataUpdateCount: number } }) =>
    query.state.data?.state === 'pending' && query.state.dataUpdateCount < OFFER_POLL_MAX_READS
      ? OFFER_POLL_MS
      : false,
})

export const searchLinksQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/accommodation/search-links', {
    params: { path: { trip_id: tripId } },
  })
