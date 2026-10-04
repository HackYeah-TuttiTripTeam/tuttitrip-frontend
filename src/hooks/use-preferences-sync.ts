import { useQueryClient } from '@tanstack/react-query'
import { preferencesQueryOptions } from '@/api/queries/preferences'

/**
 * What every save of one person's preferences shares: the query key, the mutation scope that
 * queues the saves, and the reload. Only the last queued save reloads, or a reload would
 * overwrite the value of a save still waiting.
 */
export function usePreferencesSync(tripId: string, profileId: string) {
  const queryClient = useQueryClient()
  const queryKey = preferencesQueryOptions(tripId, profileId).queryKey
  const scopeId = `preferences-${profileId}`
  const reload = () => queryClient.invalidateQueries({ queryKey })
  return {
    queryClient,
    queryKey,
    scope: { id: scopeId },
    reload,
    reloadIfLast: () =>
      queryClient.isMutating({
        predicate: (mutation) => mutation.options.scope?.id === scopeId,
      }) === 1
        ? reload()
        : undefined,
  }
}
