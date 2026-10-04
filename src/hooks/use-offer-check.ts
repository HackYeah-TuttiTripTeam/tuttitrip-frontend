import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchClient } from '@/api/client'
import { ApiError, classifyApiError } from '@/api/errors'
import { type Offer, offerQueryOptions } from '@/api/queries/accommodation'
import { OFFER_POLL_MAX_READS, OFFER_PROVIDER } from '@/lib/constants'

export interface OfferSubmission {
  /** The pasted text of the offer. */
  text: string
  /** The link to the offer; its domain decides the platform requirements. */
  url: string
  /** Check-in dates of the nights the offer is for. */
  nights: string[]
}

/**
 * Pasted offer -> stored document -> check. The check can take a while in the worker, so the offer
 * is read again every few seconds while it is pending (see `offerQueryOptions`). `offerId` is the
 * checked offer the URL holds; a new check hands its id to `onCreated`.
 */
export function useOfferCheck(
  tripId: string,
  offerId: string | undefined,
  onCreated: (offerId: string) => void,
) {
  const queryClient = useQueryClient()
  const query = useQuery({
    ...offerQueryOptions(tripId, offerId ?? ''),
    enabled: offerId !== undefined,
  })

  const mutation = useMutation({
    mutationFn: async (submission: OfferSubmission & { documentId?: string }) => {
      let documentId = submission.documentId
      if (!documentId) {
        const { data: document } = await fetchClient.POST(
          '/api/v1/planning/linter/trips/{trip_id}/documents',
          { params: { path: { trip_id: tripId } }, body: { kind: 'offer', text: submission.text } },
        )
        documentId = document?.id
      }
      // An answer without a body is a failure the screen words itself (offer_submit_failed).
      if (!documentId) throw new ApiError(500, undefined)
      const { data } = await fetchClient.POST('/api/v1/trips/{trip_id}/accommodation/offers', {
        params: { path: { trip_id: tripId } },
        body: {
          document_id: documentId,
          nights: submission.nights,
          url: submission.url.trim() || null,
          provider: OFFER_PROVIDER,
        },
      })
      return data
    },
    onSuccess: (offer) => {
      if (!offer) return
      queryClient.setQueryData(offerQueryOptions(tripId, offer.id).queryKey, offer)
      onCreated(offer.id)
    },
  })

  const offer: Offer | undefined = query.data
  return {
    offer,
    isLoading: query.isPending && query.fetchStatus !== 'idle',
    /** The worker kept the check pending past the polling limit: the screen offers to start again. */
    timedOut:
      offer?.state === 'pending' &&
      (queryClient.getQueryState(offerQueryOptions(tripId, offerId ?? '').queryKey)
        ?.dataUpdateCount ?? 0) >= OFFER_POLL_MAX_READS,
    problem: query.isError ? classifyApiError(query.error) : null,
    submit: (submission: OfferSubmission) => mutation.mutate(submission),
    /** Checks the same stored text again against the current requirements. */
    recheck: () =>
      offer &&
      mutation.mutate({
        documentId: offer.document_id,
        text: '',
        url: offer.url ?? '',
        nights: offer.nights,
      }),
    isSubmitting: mutation.isPending,
    submitError: mutation.error,
  }
}
