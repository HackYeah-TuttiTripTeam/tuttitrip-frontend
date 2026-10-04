import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchClient } from '@/api/client'
import type { ReasonCode } from '@/api/queries/vetoes'
import { type Rating, type RatingValue, ratingsQueryOptions } from '@/api/queries/vetoes'

export interface PlanPlaceRating {
  placeId: string
  value: RatingValue
  /** Needed for `dont_want`, one touch from the reasons of the dictionary. */
  reason?: ReasonCode
}

/**
 * Thumb rating of a place on the plan. Shown at once (the ratings list of the trip is changed in
 * place) and put back when the save fails. The person is one whose rating it is: the caller's own
 * profile, or any profile for the host.
 */
export function useRatePlanPlace(tripId: string, profileId: string) {
  const queryClient = useQueryClient()
  const { queryKey } = ratingsQueryOptions(tripId)
  return useMutation({
    scope: { id: `rating-${profileId}` },
    mutationFn: ({ placeId, value, reason }: PlanPlaceRating) =>
      fetchClient.PUT('/api/v1/trips/{trip_id}/profiles/{profile_id}/ratings/{place_id}', {
        params: { path: { trip_id: tripId, profile_id: profileId, place_id: placeId } },
        body: value === 'dont_want' ? { value, reason_code: reason ?? 'other' } : { value },
      }),
    onMutate: async ({ placeId, value, reason }) => {
      await queryClient.cancelQueries({ queryKey })
      const before = queryClient.getQueryData<Rating[]>(queryKey)
      const rest = (before ?? []).filter(
        (rating) => !(rating.profile_id === profileId && rating.place_id === placeId),
      )
      queryClient.setQueryData<Rating[]>(
        queryKey,
        value === 'neutral'
          ? rest
          : [
              ...rest,
              {
                trip_id: tripId,
                profile_id: profileId,
                place_id: placeId,
                value,
                reason_code: value === 'dont_want' ? (reason ?? 'other') : null,
                updated_by_sub: '',
                updated_at: new Date().toISOString(),
              },
            ],
      )
      return { before }
    },
    onError: (_error, _rating, context) => queryClient.setQueryData(queryKey, context?.before),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}
