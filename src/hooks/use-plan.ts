import { useIsMutating, useQuery } from '@tanstack/react-query'
import { ApiError, classifyApiError } from '@/api/errors'
import { type Plan, planQueryOptions } from '@/api/queries/plans'

/**
 * The current plan of a trip. A 404 is not an error here: it means the trip has no plan yet
 * (`hasNoPlan`). A recalculation keeps `plan` as it is until the new one lands in the cache, so the
 * old plan stays on screen without any placeholder data (which would leak across trips).
 */
export function usePlan(tripId: string) {
  const query = useQuery(planQueryOptions(tripId))
  // Widened to the plan with the fields of backend#54, which the generated types do not have yet.
  const plan: Plan | undefined = query.data
  const problem = query.isError ? classifyApiError(query.error) : null
  // Any recalculation counts: the button, a slider, a veto. The old plan stays on screen meanwhile.
  const recalculating = useIsMutating({ mutationKey: ['post', '/api/v1/trips/{trip_id}/plans'] })

  return {
    plan,
    isPending: query.isPending,
    isRecalculating: recalculating > 0,
    hasNoPlan: problem === 'not_found',
    forbidden: query.error instanceof ApiError && query.error.status === 403,
    problem: problem === 'not_found' ? null : problem,
    refetch: () => void query.refetch(),
  }
}
