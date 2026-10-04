import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { planQueryOptions } from '@/api/queries/plans'

/** Builds the plan and puts the answer straight into the "latest plan" cache. */
export function useCreatePlan(tripId: string) {
  const queryClient = useQueryClient()
  const mutation = $api.useMutation('post', '/api/v1/trips/{trip_id}/plans', {
    onSuccess: async (plan) => {
      const { queryKey } = planQueryOptions(tripId)
      // A fetch of the old plan still in flight must not overwrite the new one.
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData(queryKey, plan)
    },
  })

  return {
    create: () => mutation.mutate({ params: { path: { trip_id: tripId } }, body: null }),
    isPending: mutation.isPending,
    // The generated type of the error is `never` (no error body is documented); it is an ApiError.
    error: mutation.error as Error | null,
  }
}
