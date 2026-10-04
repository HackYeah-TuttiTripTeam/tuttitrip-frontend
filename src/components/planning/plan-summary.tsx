import { Bed } from '@keyline-icons/react'
import type { Plan } from '@/api/queries/plans'
import { HelpHint } from '@/components/shared/help-hint'
import { formatDecimal } from '@/lib/format'
import { m } from '@/paraglide/messages'

/** The cost of the whole plan for the group and, for a trip with nights, where they sleep. */
export function PlanSummary({ plan, hints = true }: { plan: Plan; hints?: boolean }) {
  const { currency, cost } = plan.budget
  const { lodging } = plan
  return (
    <div className="flex flex-col gap-1 text-sm leading-[22px]">
      <p className="flex items-center gap-1 font-heading font-semibold tabular-nums">
        {m.plan_total({ amount: formatDecimal(cost, currency) })}
        {hints && <HelpHint id="cost" />}
      </p>
      {lodging && (
        <p className="flex items-start gap-2 text-muted-foreground">
          <span aria-hidden="true" className="mt-0.5 [&_svg]:size-4">
            <Bed />
          </span>
          <span>
            {m.plan_lodging({
              name: lodging.name,
              count: lodging.nights,
              cost:
                lodging.cost_total != null
                  ? m.plan_lodging_cost({ amount: formatDecimal(lodging.cost_total, currency) })
                  : m.plan_lodging_cost_none(),
            })}
          </span>
        </p>
      )}
    </div>
  )
}
