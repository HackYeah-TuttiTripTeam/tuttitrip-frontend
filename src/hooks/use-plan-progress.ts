import { useQuery } from '@tanstack/react-query'
import { planProgressQueryOptions } from '@/api/queries/plan-progress'

/**
 * The stage of the plan computation while `active` (a build or recalculation is in flight).
 * It only reads: a failed poll leaves the last known stage and never reports an error, because the
 * request that builds the plan reports its own.
 */
export function usePlanProgress(tripId: string, active: boolean) {
  const { data } = useQuery(planProgressQueryOptions(tripId, active))
  return active ? (data ?? null) : null
}
