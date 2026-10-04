import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { vetoesQueryOptions } from '@/api/queries/vetoes'
import { useCreatePlan } from './use-create-plan'

export type VetoStatus = 'idle' | 'saving' | 'recalculating' | 'not_recalculated' | 'failed'

/**
 * Vetoes a place for a person (the host can do it for anyone), then recalculates the plan. No
 * optimistic update: a veto changes the plan, so the screen says "recalculating". When the veto is
 * saved but the recalculation fails, the status says so and `retry` recalculates again.
 */
export function useVetoPlace(tripId: string) {
  const queryClient = useQueryClient()
  const plan = useCreatePlan(tripId)
  const veto = $api.useMutation('post', '/api/v1/trips/{trip_id}/vetoes', {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: vetoesQueryOptions(tripId).queryKey })
      plan.create()
    },
  })

  const status: VetoStatus = veto.isPending
    ? 'saving'
    : veto.isError
      ? 'failed'
      : plan.isPending
        ? 'recalculating'
        : plan.error
          ? 'not_recalculated'
          : 'idle'

  return {
    status,
    submit: (profileId: string, placeId: string) =>
      veto.mutate({
        params: { path: { trip_id: tripId } },
        body: { profile_id: profileId, place_id: placeId },
      }),
    retry: () => plan.create(),
  }
}
