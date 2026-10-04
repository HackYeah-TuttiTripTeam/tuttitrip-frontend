import { Wallet } from '@keyline-icons/react'
import type { PlanBudget } from '@/api/queries/plans'
import { Button } from '@/components/ui/button'
import { formatDecimal } from '@/lib/format'
import { m } from '@/paraglide/messages'

interface BudgetConsentBannerProps {
  budget: PlanBudget
  canDecide: boolean
  onOpen: () => void
}

/**
 * A plan over `B_do` says so on every screen, for every role: the host can open the decision,
 * everyone else is told the host decides. A settled approval stays as one quiet line.
 */
export function BudgetConsentBanner({ budget, canDecide, onOpen }: BudgetConsentBannerProps) {
  const over = formatDecimal(budget.over_budget, budget.currency)
  const settled = budget.approval_status === 'approved'
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2 text-sm leading-relaxed">
        <span aria-hidden="true" className="mt-0.5 shrink-0 [&_svg]:size-4">
          <Wallet />
        </span>
        <span>
          {settled
            ? m.consent_banner_approved({ over })
            : canDecide
              ? m.consent_banner_host({ over })
              : m.consent_banner_waiting({ over })}
        </span>
      </p>
      {!settled && canDecide && (
        <Button className="h-11 rounded-full px-5" onClick={onOpen}>
          {m.consent_banner_open()}
        </Button>
      )}
    </div>
  )
}
