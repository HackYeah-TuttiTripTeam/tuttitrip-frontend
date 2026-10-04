import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { type PlanCreate, planBeforeQueryKey, planQueryOptions } from '@/api/queries/plans'

/**
 * Builds the plan and puts the answer straight into the "latest plan" cache. Without a body the
 * API uses the trip's own settings (its `fairness_alpha`, the stored weights).
 */
export function useCreatePlan(tripId: string) {
  const queryClient = useQueryClient()
  const mutation = $api.useMutation('post', '/api/v1/trips/{trip_id}/plans', {
    // Remember the plan from before, so the panel can say what the recalculation changed (or that
    // it changed nothing, also when the API answers with the same version).
    onMutate: () => {
      const before = queryClient.getQueryData(planQueryOptions(tripId).queryKey) ?? null
      queryClient.setQueryData(planBeforeQueryKey(tripId), before)
    },
    onError: () => queryClient.setQueryData(planBeforeQueryKey(tripId), null),
    onSuccess: async (plan) => {
      const { queryKey } = planQueryOptions(tripId)
      // A fetch of the old plan still in flight must not overwrite the new one.
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData(queryKey, plan)
    },
  })
  const request = (body: PlanCreate | null) => ({ params: { path: { trip_id: tripId } }, body })

  return {
    create: (body: PlanCreate | null = null) => mutation.mutate(request(body)),
    createAsync: (body: PlanCreate | null = null) => mutation.mutateAsync(request(body)),
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}
