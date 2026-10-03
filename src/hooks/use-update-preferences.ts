import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchClient } from '@/api/client'
import {
  type Preferences,
  type PreferencesWrite,
  preferencesQueryOptions,
} from '@/api/queries/preferences'
import { applyWrite, toWrite } from '@/lib/preferences'

/** One change, written against whatever the preferences are when it is applied. */
export type PreferencesChange = (current: Preferences) => PreferencesWrite

/**
 * PUT of one person's preferences. The screen shows a change at once (optimistic). The body is
 * built when the save runs, from what the server has confirmed plus this one change, so a change
 * whose save failed never rides along with a later one. `scope` queues the saves of a person.
 * A failure, like the last save, reloads from the server, which also takes the value back.
 */
export function useUpdatePreferences(tripId: string, profileId: string) {
  const queryClient = useQueryClient()
  const queryKey = preferencesQueryOptions(tripId, profileId).queryKey
  const scopeId = `preferences-${profileId}`
  const path = { params: { path: { trip_id: tripId, profile_id: profileId } } }
  const reload = () => queryClient.invalidateQueries({ queryKey })

  return useMutation({
    scope: { id: scopeId },
    mutationFn: async (change: PreferencesChange) => {
      const confirmed = await fetchClient.GET(
        '/api/v1/trips/{trip_id}/profiles/{profile_id}/preferences',
        path,
      )
      if (!confirmed.data) throw new Error('No preferences')
      const result = await fetchClient.PUT(
        '/api/v1/trips/{trip_id}/profiles/{profile_id}/preferences',
        { ...path, body: toWrite(confirmed.data, change(confirmed.data)) },
      )
      return result.data
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey })
      const shown = queryClient.getQueryData<Preferences>(queryKey)
      if (shown) queryClient.setQueryData(queryKey, applyWrite(shown, change(shown)))
    },
    onError: reload,
    // Only the last save reloads, or a reload would overwrite the value of a save still queued.
    onSuccess: () =>
      queryClient.isMutating({
        predicate: (mutation) => mutation.options.scope?.id === scopeId,
      }) === 1
        ? reload()
        : undefined,
  })
}
