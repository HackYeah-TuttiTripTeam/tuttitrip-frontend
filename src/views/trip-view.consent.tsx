import { useState } from 'react'
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
 * it from the banner after "Później"); everyone else only reads, in the banner, that the host
 * decides.
 */
export function PlanConsent({ plan, trip }: PlanConsentProps) {
  const { budget } = plan
  const canDecide = trip.my_role === 'host'
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const pending = budget.needs_approval && budget.approval_status === 'pending'
  const decision = useBudgetDecision(trip.id, canDecide && pending)
  const [later, setLater] = useState(false)

  if (!budget.needs_approval) return null

  const gainName =
    plan.fairness.per_person.find((person) => person.profile_id === budget.gain_profile_id)?.name ??
    null
  const error = decision.changed
    ? m.consent_changed()
    : decision.forbidden
      ? m.consent_forbidden()
      : decision.failed
        ? m.consent_failed()
        : null

  return (
    <>
      <BudgetConsentBanner
        budget={budget}
        canDecide={canDecide}
        onOpen={() => {
          decision.reset()
          setLater(false)
        }}
      />
      {pending && canDecide && (
        <BudgetConsentDialog
          open={!later}
          isDesktop={isDesktop}
          budget={budget}
          gainName={gainName}
          busy={decision.isPending || !decision.approval}
          error={error}
          onApprove={() => decision.decide('approve')}
          onReject={() => decision.decide('reject')}
          onLater={() => setLater(true)}
        />
      )}
    </>
  )
}
