import { useMutation } from '@tanstack/react-query'
import { fetchClient } from '@/api/client'
import type { ExampleVerdict, Preferences } from '@/api/queries/preferences'
import { withCatalogRating } from '@/lib/preferences'
import { usePreferencesSync } from './use-preferences-sync'

export interface PlaceRating {
  placeId: string
  name: string
  /** Null takes the rating back (the API's "neutral"). */
  verdict: ExampleVerdict | null
}

/**
 * Thumb rating of one catalog place, sent on its own to the ratings endpoint. The preferences
 * GET merges these ratings into `example_places`, but a PUT of the preferences never removes
 * one, so a rating is never echoed back through it. Shown at once, put back on failure.
 */
export function useRatePlace(tripId: string, profileId: string) {
  const { queryClient, queryKey, scope, reload, reloadIfLast } = usePreferencesSync(
    tripId,
    profileId,
  )

  return useMutation({
    scope,
    mutationFn: ({ placeId, verdict }: PlaceRating) =>
      fetchClient.PUT('/api/v1/trips/{trip_id}/profiles/{profile_id}/ratings/{place_id}', {
        params: { path: { trip_id: tripId, profile_id: profileId, place_id: placeId } },
        body:
          verdict === null
            ? { value: 'neutral' }
            : verdict === 'like'
              ? { value: 'want' }
              : { value: 'dont_want', reason_code: 'other' },
      }),
    onMutate: async (rating) => {
      await queryClient.cancelQueries({ queryKey })
      const shown = queryClient.getQueryData<Preferences>(queryKey)
      if (shown)
        queryClient.setQueryData(queryKey, {
          ...shown,
          example_places: withCatalogRating(shown.example_places, rating),
        })
    },
    onError: reload,
    onSuccess: reloadIfLast,
  })
}
