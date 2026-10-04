import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { ApiError } from '@/api/errors'
import { planQueryOptions } from '@/api/queries/plans'
import { pendingReplansKey } from '@/api/queries/replan'
import { m } from '@/paraglide/messages'

export function replanFailure(error: unknown): string {
  if (error instanceof TypeError) return m.replan_failed_offline()
  if (error instanceof ApiError && error.status === 403) return m.replan_failed_forbidden()
  return m.replan_failed()
}

/**
 * "Rain" for the rest of a day (backend #74): the API answers in milliseconds with the new rest of
 * the day and the list of changes. A host's change is active at once, so the plan is fetched again;
 * a member's change that touches others waits for the host (`pending_host`), the plan stays.
 * `asOf` is the simulated time of the demo account.
 */
export function useReplan(tripId: string, planId: string | undefined) {
  const queryClient = useQueryClient()
  const mutation = $api.useMutation('post', '/api/v1/trips/{trip_id}/plans/{plan_id}/replan', {
    onSuccess: async (result) => {
      await Promise.all([
        result.status === 'active'
          ? queryClient.invalidateQueries({ queryKey: planQueryOptions(tripId).queryKey })
          : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: pendingReplansKey(tripId) }),
      ])
    },
  })
  return {
    replan: (day: number, asOf: string | undefined) =>
      planId &&
      mutation.mutate({
        params: { path: { trip_id: tripId, plan_id: planId } },
        body: { context: 'rain', day, as_of: asOf ?? null },
      }),
    result: mutation.data,
    isPending: mutation.isPending,
    error: mutation.isError ? replanFailure(mutation.error) : null,
    reset: mutation.reset,
  }
}
