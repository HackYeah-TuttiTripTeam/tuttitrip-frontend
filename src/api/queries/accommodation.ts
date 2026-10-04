import { $api, type Schemas } from '@/api/client'

/** How often a pending offer check is read again (the worker needs a few seconds). */
export const OFFER_POLL_MS = 2000

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
  refetchInterval: (query: { state: { data: Offer | undefined } }) =>
    query.state.data?.state === 'pending' ? OFFER_POLL_MS : false,
})

export const searchLinksQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/accommodation/search-links', {
    params: { path: { trip_id: tripId } },
  })
