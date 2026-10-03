import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { planQueryOptions } from '@/api/queries/plans'

/** Builds the plan and puts the answer straight into the "latest plan" cache. */
export function useCreatePlan(tripId: string) {
  const queryClient = useQueryClient()
  const mutation = $api.useMutation('post', '/api/v1/trips/{trip_id}/plans', {
    onSuccess: (plan) => queryClient.setQueryData(planQueryOptions(tripId).queryKey, plan),
  })

  return {
    create: () => mutation.mutate({ params: { path: { trip_id: tripId } }, body: null }),
    isPending: mutation.isPending,
    error: mutation.error,
  }
}
