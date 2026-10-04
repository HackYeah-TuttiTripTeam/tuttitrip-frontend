import { useQuery } from '@tanstack/react-query'
import { type Plan, planBeforeQueryKey } from '@/api/queries/plans'
import { type PlanChange, planChange } from '@/lib/fairness'

/**
 * What the fairness panel shows next to the numbers of the plan on screen: how they moved since
 * the plan that was there when the last recalculation started (null before any recalculation).
 * The numbers themselves come from the API, read from the same plan version as the days.
 */
export function useFairness(tripId: string, plan: Plan | undefined): { change: PlanChange | null } {
  const { data: before } = useQuery<Plan | null>({
    queryKey: planBeforeQueryKey(tripId),
    queryFn: () => null,
    enabled: false,
    staleTime: Number.POSITIVE_INFINITY,
    initialData: null,
  })
  return { change: before && plan ? planChange(before, plan) : null }
}
