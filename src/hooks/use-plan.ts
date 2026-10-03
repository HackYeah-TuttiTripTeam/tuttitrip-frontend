import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { planQueryOptions } from '@/api/queries/plans'

/**
 * The current plan of a trip. While the key changes (or it is refetched) the old plan stays in
 * `plan`, so a recalculation shows "recalculating" over the old plan instead of an empty screen.
 * The view is keyed by trip id, so the old plan never leaks into another trip.
 * A 404 is not an error here: it means the trip has no plan yet (`hasNoPlan`).
 */
export function usePlan(tripId: string) {
  const query = useQuery({ ...planQueryOptions(tripId), placeholderData: keepPreviousData })
  const problem = query.isError ? classifyApiError(query.error) : null

  return {
    plan: query.data,
    isPending: query.isPending,
    hasNoPlan: problem === 'not_found',
    problem: problem === 'not_found' ? null : problem,
    refetch: () => void query.refetch(),
  }
}
