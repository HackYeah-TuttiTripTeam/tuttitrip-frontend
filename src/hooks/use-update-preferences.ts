import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { type Preferences, preferencesQueryOptions } from '@/api/queries/preferences'
import { applyWrite } from '@/lib/preferences'

/**
 * PUT of one person's preferences, optimistic: the screen shows the new value at once, goes back
 * to the old one when the save fails, and reloads from the server when it settles.
 * `scope` queues the saves of one person, so quick taps reach the server in order.
 */
export function useUpdatePreferences(tripId: string, profileId: string) {
  const queryClient = useQueryClient()
  const queryKey = preferencesQueryOptions(tripId, profileId).queryKey
  const scopeId = `preferences-${profileId}`

  return $api.useMutation('put', '/api/v1/trips/{trip_id}/profiles/{profile_id}/preferences', {
    scope: { id: scopeId },
    onMutate: async ({ body }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Preferences>(queryKey)
      if (previous) queryClient.setQueryData(queryKey, applyWrite(previous, body))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    // Only the last save reloads, or a reload would overwrite the value of a save still queued.
    onSettled: () =>
      queryClient.isMutating({
        predicate: (mutation) => mutation.options.scope?.id === scopeId,
      }) === 1
        ? queryClient.invalidateQueries({ queryKey })
        : undefined,
  })
}
