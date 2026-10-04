import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchClient } from '@/api/client'
import { classifyApiError } from '@/api/errors'
import {
  offersKey,
  type RequirementItem,
  type Requirements,
  requirementsQueryOptions,
} from '@/api/queries/accommodation'

/**
 * The lodging requirements of a trip and the switches that change them. The API takes the whole
 * set, so every change sends the new set; the screen shows it at once and puts the old one back
 * when the save fails. Saves run one after another, so quick taps cannot overwrite each other.
 */
export function useAccommodationRequirements(tripId: string, enabled: boolean) {
  const queryClient = useQueryClient()
  const options = requirementsQueryOptions(tripId)
  const query = useQuery({ ...options, enabled })

  const mutation = useMutation({
    scope: { id: `accommodation-requirements-${tripId}` },
    mutationFn: async (requirements: RequirementItem[]) => {
      const { data } = await fetchClient.PUT('/api/v1/trips/{trip_id}/accommodation/requirements', {
        params: { path: { trip_id: tripId } },
        body: { requirements },
      })
      return data
    },
    onMutate: async (requirements) => {
      await queryClient.cancelQueries({ queryKey: options.queryKey })
      const shown = queryClient.getQueryData<Requirements>(options.queryKey)
      if (shown) queryClient.setQueryData(options.queryKey, { ...shown, requirements })
    },
    // Either way the server's copy is the truth: after a failure it undoes the guess above.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: options.queryKey }),
        // The API compares a check with the current requirements on every read: "stale".
        queryClient.invalidateQueries({ queryKey: offersKey }),
      ]),
  })

  return {
    requirements: query.data?.requirements ?? [],
    version: query.data?.version,
    isPending: query.isPending && query.fetchStatus !== 'idle',
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
    /** Applies a change to the set the screen shows right now. */
    change: (update: (current: RequirementItem[]) => RequirementItem[]) => {
      const current = queryClient.getQueryData<Requirements>(options.queryKey)?.requirements ?? []
      mutation.mutate(update(current))
    },
    saveFailed: mutation.isError,
  }
}
