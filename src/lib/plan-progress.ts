import type { Schemas } from '@/api/client'

export type PlanStepCode = Schemas['PlanStep']
export type StepState = 'done' | 'current' | 'pending'

/** The stages of `docs/algorytm.md` in the order the API works through them. */
export const PLAN_PROGRESS_STEPS = [
  'catalogue',
  'reference',
  'search',
  'floors',
  'budget',
  'verdicts',
] as const satisfies readonly PlanStepCode[]

/** How often the stage is read while a plan is being computed. */
export const PLAN_PROGRESS_POLL_MS = 500

/**
 * Done, current and remaining stages. Before the first answer the first stage counts as current;
 * a stage the computation skipped (the reference runs of a single traveller) is done once a later
 * one has started.
 */
export function stepStates(
  current: PlanStepCode | null,
): { step: PlanStepCode; state: StepState }[] {
  const at = current ? PLAN_PROGRESS_STEPS.indexOf(current) : 0
  return PLAN_PROGRESS_STEPS.map((step, index) => ({
    step,
    state: index < at ? 'done' : index === at ? 'current' : 'pending',
  }))
}
