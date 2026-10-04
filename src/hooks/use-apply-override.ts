import { useQueryClient } from '@tanstack/react-query'
import { $api, fetchClient } from '@/api/client'
import { decisionsKey } from '@/api/queries/decisions'
import { planQueryOptions } from '@/api/queries/plans'

interface OverrideRequest {
  placeId: string
  kind: 'must' | 'block'
  reason: string
}

/**
 * Saves the host's decision, then recomputes the plan (the API stores the decision as a hard
 * constraint of the next plan) and puts the new plan in the cache. The log is read again.
 */
export function useApplyOverride(tripId: string) {
  const queryClient = useQueryClient()
  const mutation = $api.useMutation('post', '/api/v1/trips/{trip_id}/overrides')

  const apply = async ({ placeId, kind, reason }: OverrideRequest) => {
    await mutation.mutateAsync({
      params: { path: { trip_id: tripId } },
      body: { place_id: placeId, kind, reason: reason.trim() || null },
    })
    const { data: plan } = await fetchClient.POST('/api/v1/trips/{trip_id}/plans', {
      params: { path: { trip_id: tripId } },
      body: null,
    })
    const { queryKey } = planQueryOptions(tripId)
    await queryClient.cancelQueries({ queryKey })
    if (plan) queryClient.setQueryData(queryKey, plan)
    await queryClient.invalidateQueries({ queryKey: decisionsKey })
  }

  return { apply, isPending: mutation.isPending, error: mutation.error, reset: mutation.reset }
}
