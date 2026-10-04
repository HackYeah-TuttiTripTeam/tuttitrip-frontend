import { useQuery } from '@tanstack/react-query'
import { HTTP_STATUS } from '@/api/constants'
import { ApiError, classifyApiError } from '@/api/errors'
import { planQueryOptions } from '@/api/queries/plans'

/**
 * The current plan of a trip. A 404 is not an error here: it means the trip has no plan yet
 * (`hasNoPlan`). A recalculation keeps `plan` as it is until the new one lands in the cache, so the
 * old plan stays on screen without any placeholder data (which would leak across trips).
 */
export function usePlan(tripId: string) {
  const query = useQuery(planQueryOptions(tripId))
  const problem = query.isError ? classifyApiError(query.error) : null

  return {
    plan: query.data,
    isPending: query.isPending,
    hasNoPlan: problem === 'not_found',
    forbidden: query.error instanceof ApiError && query.error.status === HTTP_STATUS.forbidden,
    problem: problem === 'not_found' ? null : problem,
    refetch: () => void query.refetch(),
  }
}
