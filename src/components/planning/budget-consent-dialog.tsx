import type { PlanBudget } from '@/api/queries/plans'
import { ApprovalCard, type ApprovalFact } from '@/components/shared/approval-card'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { GAIN_POINTS_DIGITS } from '@/lib/constants'
import { formatDecimal, formatNumber, formatSignedDecimal } from '@/lib/format'
import { m } from '@/paraglide/messages'

interface BudgetConsentDialogProps {
  open: boolean
  isDesktop: boolean
  budget: PlanBudget
  /** Name of the person who gains most from going over, when the API names one. */
  gainName: string | null
  busy: boolean
  error: string | null
  onApprove: () => void
  onReject: () => void
  /** "Później": closes without a decision; the plan keeps waiting. */
  onLater: () => void
}

/**
 * The host's consent to a plan over `B_do` (E6): how far over, what a point costs, who gains and
 * the plan within the limit as the way back. Confirm-Destroy: a click outside or Escape never
 * closes it; only a decision or "Później" does.
 */
export function BudgetConsentDialog({
  open,
  isDesktop,
  budget,
  gainName,
  busy,
  error,
  onApprove,
  onReject,
  onLater,
}: BudgetConsentDialogProps) {
  const { currency } = budget
  const over = formatSignedDecimal(budget.over_budget, currency)
  const price = budget.kappa
    ? m.consent_price_per_point({ amount: formatDecimal(budget.kappa, currency) })
    : null

  const facts: ApprovalFact[] = [
    { label: m.consent_cost(), value: formatDecimal(budget.cost, currency), mono: true },
    ...(budget.b_to
      ? [{ label: m.consent_limit(), value: formatDecimal(budget.b_to, currency), mono: true }]
      : []),
    { label: m.consent_over(), value: over, mono: true },
    ...(budget.b_max
      ? [{ label: m.consent_max(), value: formatDecimal(budget.b_max, currency), mono: true }]
      : []),
    ...(price ? [{ label: m.consent_kappa(), value: price, mono: true }] : []),
    ...(budget.gain_points != null
      ? [
          {
            label: m.consent_gain(),
            value: m.consent_gain_value({
              name: gainName ?? m.consent_gain_someone(),
              points: formatNumber(budget.gain_points, GAIN_POINTS_DIGITS),
            }),
          },
        ]
      : []),
  ]

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onLater()
      }}
      isDesktop={isDesktop}
      dismissible={false}
      title={m.consent_title()}
      description={
        price ? m.consent_summary({ over, price }) : m.consent_summary_no_price({ over })
      }
    >
      <ApprovalCard
        facts={facts}
        approve={[{ key: 'approve', label: m.consent_approve(), onClick: onApprove }]}
        rejectLabel={m.consent_reject()}
        onReject={onReject}
        laterLabel={m.consent_later()}
        onLater={onLater}
        busy={busy}
        error={error}
      >
        {budget.strict_cost && (
          <section className="rounded-lg border p-4">
            <h3 className="font-medium text-sm">{m.consent_alternative_title()}</h3>
            <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
              {m.consent_alternative_body({
                cost: formatDecimal(budget.strict_cost, currency),
              })}
            </p>
          </section>
        )}
      </ApprovalCard>
    </ResponsiveModal>
  )
}
