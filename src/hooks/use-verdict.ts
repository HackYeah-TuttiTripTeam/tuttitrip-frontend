import { useMemo } from 'react'
import type { Plan } from '@/api/queries/plans'
import { indexVerdicts } from '@/lib/verdicts'

/**
 * The verdicts of the plan by place, read from the plan itself (the API has no separate verdict
 * endpoint). A plan from before the verdicts existed has none: the index is empty.
 */
export function useVerdicts(plan: Pick<Plan, 'verdicts' | 'explain'> | undefined) {
  const verdicts = plan?.verdicts
  const explain = plan?.explain
  return useMemo(
    () => indexVerdicts({ verdicts: verdicts ?? null, explain: explain ?? [] }),
    [verdicts, explain],
  )
}
