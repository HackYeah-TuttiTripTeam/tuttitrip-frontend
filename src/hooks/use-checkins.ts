import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { classifyApiError } from '@/api/errors'
import { type CheckinsQuery, checkinsKey, checkinsQueryOptions } from '@/api/queries/checkins'

/** One page of the group's check-ins; the previous page stays on screen while the next loads. */
export function useCheckins(tripId: string, query: CheckinsQuery) {
  const result = useQuery({
    ...checkinsQueryOptions(tripId, query),
    placeholderData: keepPreviousData,
  })
  return {
    page: result.data,
    isPending: result.isPending,
    isFetching: result.isFetching,
    problem: result.isError ? classifyApiError(result.error) : null,
    refetch: () => void result.refetch(),
  }
}

/** Saving and removing an entry; both refresh every page of the list. */
export function useCheckinActions(tripId: string) {
  const queryClient = useQueryClient()
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: checkinsKey(tripId) })
  const save = $api.useMutation('put', '/api/v1/trips/{trip_id}/checkins/{profile_id}', {
    onSuccess,
  })
  const remove = $api.useMutation('delete', '/api/v1/trips/{trip_id}/checkins/{profile_id}', {
    onSuccess,
  })
  return {
    save: (profileId: string, accommodation: string, room: string | null) =>
      save.mutateAsync({
        params: { path: { trip_id: tripId, profile_id: profileId } },
        body: { accommodation, room },
      }),
    remove: (profileId: string) =>
      remove.mutateAsync({ params: { path: { trip_id: tripId, profile_id: profileId } } }),
    isSaving: save.isPending,
    saveError: save.error,
    resetSave: save.reset,
  }
}
