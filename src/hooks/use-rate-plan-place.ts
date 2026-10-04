import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchClient } from '@/api/client'
import { type Rating, type ReasonCode, ratingsQueryOptions } from '@/api/queries/vetoes'

/** A thumb up, a thumb back to neutral, or a thumb down, which always carries its reason. */
export type PlanPlaceRating =
  | { placeId: string; value: 'want' }
  | { placeId: string; value: 'neutral' }
  | { placeId: string; value: 'dont_want'; reason: ReasonCode }

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
    mutationFn: (rating: PlanPlaceRating) =>
      fetchClient.PUT('/api/v1/trips/{trip_id}/profiles/{profile_id}/ratings/{place_id}', {
        params: { path: { trip_id: tripId, profile_id: profileId, place_id: rating.placeId } },
        body:
          rating.value === 'dont_want'
            ? { value: rating.value, reason_code: rating.reason }
            : { value: rating.value },
      }),
    onMutate: async (rating) => {
      await queryClient.cancelQueries({ queryKey })
      const before = queryClient.getQueryData<Rating[]>(queryKey)
      const rest = (before ?? []).filter(
        (existing) => !(existing.profile_id === profileId && existing.place_id === rating.placeId),
      )
      const reasonCode: ReasonCode | null = rating.value === 'dont_want' ? rating.reason : null
      queryClient.setQueryData<Rating[]>(
        queryKey,
        rating.value === 'neutral'
          ? rest
          : [
              ...rest,
              {
                trip_id: tripId,
                profile_id: profileId,
                place_id: rating.placeId,
                value: rating.value,
                reason_code: reasonCode,
                updated_by_sub: profileId,
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
