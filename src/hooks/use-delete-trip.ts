import { type QueryKey, useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { tripsListKey } from '@/api/queries/trips'

const TRIP_PREFIX = '/api/v1/trips/{trip_id}'

/** Every cached query under /api/v1/trips/{trip_id} (the trip, its plans, people...) for one trip. */
function isQueryOfTrip(queryKey: QueryKey, tripId: string): boolean {
  const [, path, init] = queryKey
  const params = typeof init === 'object' && init !== null && 'params' in init ? init.params : null
  const inPath =
    typeof params === 'object' && params !== null && 'path' in params ? params.path : null
  return (
    typeof path === 'string' &&
    path.startsWith(TRIP_PREFIX) &&
    typeof inPath === 'object' &&
    inPath !== null &&
    'trip_id' in inPath &&
    inPath.trip_id === tripId
  )
}

/**
 * DELETE /trips/{id} (204). `onDeleted` runs first (leave the trip's page), and only then are the
 * trip's queries dropped, so the page that is still mounted never refetches into a 404.
 */
export function useDeleteTrip(onDeleted: () => Promise<void> | void) {
  const queryClient = useQueryClient()
  return $api.useMutation('delete', '/api/v1/trips/{trip_id}', {
    onSuccess: async (_data, variables) => {
      await onDeleted()
      queryClient.removeQueries({
        predicate: (query) => isQueryOfTrip(query.queryKey, variables.params.path.trip_id),
      })
      await queryClient.invalidateQueries({ queryKey: tripsListKey })
    },
  })
}
