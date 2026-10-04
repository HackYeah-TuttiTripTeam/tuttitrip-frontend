import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { tripQueryOptions, tripsListKey } from '@/api/queries/trips'

/** PATCH /trips/{id}; the answer replaces the cached trip, the list is refetched. */
export function useUpdateTrip() {
  const queryClient = useQueryClient()
  return $api.useMutation('patch', '/api/v1/trips/{trip_id}', {
    onSuccess: (trip) => {
      queryClient.setQueryData(tripQueryOptions(trip.id).queryKey, trip)
      return queryClient.invalidateQueries({ queryKey: tripsListKey })
    },
  })
}
