import { useState } from 'react'
import { ApiError } from '@/api/errors'
import type { Plan } from '@/api/queries/plans'
import type { Trip } from '@/api/queries/trips'
import { BudgetConsentBanner } from '@/components/planning/budget-consent-banner'
import { BudgetConsentDialog } from '@/components/planning/budget-consent-dialog'
import { useBudgetDecision } from '@/hooks/use-approvals'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { m } from '@/paraglide/messages'

interface PlanConsentProps {
  plan: Plan
  trip: Trip
}

/**
 * A plan over `B_do` waits for the host. The host gets the consent window (and can come back to
 * it from the banner after "Później"); everyone else only reads that the host decides.
 */
export function PlanConsent({ plan, trip }: PlanConsentProps) {
  const { budget } = plan
  const canDecide = trip.my_role === 'host'
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const { decide, isPending, error, reset } = useBudgetDecision(trip.id)
  const [later, setLater] = useState(false)

  if (!budget.needs_approval) return null

  const pending = budget.approval_status === 'pending'
  const gainName =
    plan.fairness.per_person.find((person) => person.profile_id === budget.gain_profile_id)?.name ??
    null

  return (
    <>
      <BudgetConsentBanner
        budget={budget}
        canDecide={canDecide}
        onOpen={() => {
          reset()
          setLater(false)
        }}
      />
      {pending && (
        <BudgetConsentDialog
          open={canDecide && !later}
          isDesktop={isDesktop}
          budget={budget}
          gainName={gainName}
          canDecide={canDecide}
          busy={isPending}
          error={error ? decisionError(error) : null}
          onApprove={() => void decide('approve').catch(() => undefined)}
          onReject={() => void decide('reject').catch(() => undefined)}
          onLater={() => setLater(true)}
        />
      )}
    </>
  )
}

function decisionError(error: unknown): string {
  return error instanceof ApiError && error.status === 403
    ? m.consent_forbidden()
    : m.consent_failed()
}
