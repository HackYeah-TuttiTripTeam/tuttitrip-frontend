import { useState } from 'react'
import type { Plan } from '@/api/queries/plans'
import { type PlanChange, planChange } from '@/lib/fairness'

interface Seen {
  current: Plan
  previous: Plan | null
}

/**
 * What the fairness panel shows next to the numbers of the plan on screen: how they moved since
 * the version before (null until a recalculation brings a second version). The numbers
 * themselves come from the API, read from the same plan version as the days.
 */
export function useFairness(plan: Plan | undefined): { change: PlanChange | null } {
  const [seen, setSeen] = useState<Seen | null>(null)
  // Adjusting state while rendering: remember the version we replace the moment a new one lands.
  if (plan && plan.id !== seen?.current.id)
    setSeen({ current: plan, previous: seen?.current ?? null })
  return { change: seen?.previous && plan ? planChange(seen.previous, plan) : null }
}
