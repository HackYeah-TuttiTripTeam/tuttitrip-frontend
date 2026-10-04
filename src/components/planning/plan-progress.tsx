import { Check } from '@keyline-icons/react'
import type { PlanProgress as Progress } from '@/api/queries/plan-progress'
import { PLAN_PROGRESS_STEPS, type PlanStepCode, stepStates } from '@/lib/plan-progress'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

const LABEL: Record<PlanStepCode, () => string> = {
  catalogue: m.plan_progress_catalogue,
  reference: m.plan_progress_reference,
  search: m.plan_progress_search,
  floors: m.plan_progress_floors,
  budget: m.plan_progress_budget,
  verdicts: m.plan_progress_verdicts,
}

const STATE_TEXT = {
  done: m.plan_progress_done,
  current: m.plan_progress_current,
  pending: m.plan_progress_pending,
}

interface PlanProgressProps {
  /** The stage the API reports, or null before the first answer. */
  progress: Progress | null
  className?: string
}

const labelOf = (step: PlanStepCode, progress: Progress | null) =>
  progress?.step === step && progress.item && progress.items
    ? `${LABEL[step]()} ${m.plan_progress_count({ item: progress.item, items: progress.items })}`
    : LABEL[step]()

/**
 * What the computation is doing: the stages with done, current and remaining marked, and the
 * current one announced to screen readers (the list itself is not live, so a change is read once).
 */
export function PlanProgress({ progress, className }: PlanProgressProps) {
  const steps = stepStates(progress?.step ?? null)
  const current = progress?.step ?? PLAN_PROGRESS_STEPS[0]
  const position = PLAN_PROGRESS_STEPS.indexOf(current) + 1
  return (
    <section aria-labelledby="plan-progress-title" className={cn('flex flex-col gap-3', className)}>
      <h2 id="plan-progress-title" className="font-medium text-sm">
        {m.plan_progress_title()}
      </h2>
      <p role="status" aria-live="polite" className="sr-only">
        {m.plan_progress_announce({
          position,
          total: PLAN_PROGRESS_STEPS.length,
          label: labelOf(current, progress),
        })}
      </p>
      <ol className="flex flex-col gap-2 text-sm">
        {steps.map(({ step, state }) => (
          <li
            key={step}
            aria-current={state === 'current' ? 'step' : undefined}
            className={cn(
              'flex min-h-6 items-start gap-3 leading-6',
              state === 'pending' && 'text-muted-foreground',
              state === 'current' && 'font-medium',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'mt-1 grid size-4 shrink-0 place-items-center rounded-full border',
                state === 'done' && 'border-primary bg-primary text-primary-foreground',
                state === 'current' && 'border-primary',
              )}
            >
              {state === 'done' ? (
                <Check className="size-3" />
              ) : (
                state === 'current' && (
                  <span className="size-2 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
                )
              )}
            </span>
            <span>
              {labelOf(step, progress)}
              <span className="sr-only">{`, ${STATE_TEXT[state]()}`}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
