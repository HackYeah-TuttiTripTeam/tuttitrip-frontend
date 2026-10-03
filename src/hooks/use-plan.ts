import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { planQueryOptions } from '@/api/queries/plans'

/**
 * The current plan of a trip. While it is refetched (or the key changes) the old plan stays in
 * `plan`, so a recalculation shows "recalculating" over the old plan instead of an empty screen.
 * A 404 is not an error here: it means the trip has no plan yet (`hasNoPlan`).
 */
export function usePlan(tripId: string) {
  const query = useQuery({ ...planQueryOptions(tripId), placeholderData: keepPreviousData })
  const problem = query.isError ? classifyApiError(query.error) : null

  return {
    plan: query.data,
    isPending: query.isPending,
    isRefreshing: query.isFetching && !query.isPending,
    hasNoPlan: problem === 'not_found',
    problem: problem === 'not_found' ? null : problem,
    refetch: () => void query.refetch(),
  }
}
