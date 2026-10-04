import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { planQueryOptions } from '@/api/queries/plans'
import { proposalQueryOptions } from '@/api/queries/proposals'

/** Builds the plan and puts the answer straight into the "latest plan" cache. */
export function useCreatePlan(tripId: string) {
  const queryClient = useQueryClient()
  const mutation = $api.useMutation('post', '/api/v1/trips/{trip_id}/plans', {
    onSuccess: async (plan) => {
      const { queryKey } = planQueryOptions(tripId)
      // A fetch of the old plan still in flight must not overwrite the new one.
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData(queryKey, plan)
      // A new version makes the open proposal outdated: read its status again.
      await queryClient.invalidateQueries({ queryKey: proposalQueryOptions(tripId).queryKey })
    },
  })

  return {
    create: () => mutation.mutate({ params: { path: { trip_id: tripId } }, body: null }),
    isPending: mutation.isPending,
    // The contract lists no error body for this call; the client throws an ApiError anyway.
    error: mutation.error as Error | null,
  }
}
