import {
  Calendar,
  CloudOff,
  KeyRound,
  Printer,
  RefreshCcw,
  TriangleAlert,
} from '@keyline-icons/react'
import { useState } from 'react'
import { ApiError } from '@/api/errors'
import type { Trip } from '@/api/queries/trips'
import { DayTabs } from '@/components/planning/day-tabs'
import { PlanHashLabel } from '@/components/planning/plan-hash-label'
import { PlanPrintout } from '@/components/planning/plan-printout'
import { PlanSummary } from '@/components/planning/plan-summary'
import { PlanTimeline } from '@/components/planning/plan-timeline'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreatePlan } from '@/hooks/use-create-plan'
import { usePlan } from '@/hooks/use-plan'
import { usePrinting } from '@/hooks/use-printing'
import { m } from '@/paraglide/messages'

interface TripPlanViewProps {
  trip: Trip
}

/** The Plan tab: the latest plan day by day, or the empty state with "Build plan". */
export function TripPlanView({ trip }: TripPlanViewProps) {
  const { id: tripId, my_role: role } = trip
  const printing = usePrinting()
  const { plan, isPending, hasNoPlan, forbidden, problem, refetch } = usePlan(tripId)
  const creation = useCreatePlan(tripId)
  const [day, setDay] = useState(1)
  const canBuild = role !== 'member'

  if (isPending) return <PlanSkeleton />

  if (forbidden) {
    return (
      <StatusMessage role="alert" icon={<KeyRound />} title={m.plan_forbidden_title()}>
        {m.plan_forbidden_body()}
      </StatusMessage>
    )
  }

  if (problem === 'offline') {
    return (
      <StatusMessage
        role="alert"
        icon={<CloudOff />}
        title={m.trips_offline_title()}
        action={<RetryButton onClick={refetch} />}
      >
        {m.trips_offline_body()}
      </StatusMessage>
    )
  }

  if (problem) {
    return (
      <StatusMessage
        role="alert"
        icon={<TriangleAlert />}
        title={m.plan_load_failed_title()}
        action={<RetryButton onClick={refetch} />}
      >
        {m.plan_load_failed_body()}
      </StatusMessage>
    )
  }

  const failure = creation.error && (
    <p role="alert" className="text-destructive text-sm">
      {creation.error instanceof ApiError && creation.error.status === 403
        ? m.plan_compute_forbidden()
        : m.plan_compute_failed()}
    </p>
  )

  if (hasNoPlan || !plan) {
    return (
      <StatusMessage
        icon={<Calendar />}
        title={m.plan_empty_title()}
        action={
          <div className="flex flex-col items-start gap-3 md:items-center">
            {canBuild && (
              <Button
                size="lg"
                className="h-11 rounded-full px-6"
                onClick={creation.create}
                disabled={creation.isPending}
              >
                {creation.isPending ? m.plan_computing() : m.plan_compute()}
              </Button>
            )}
            {failure}
          </div>
        }
      >
        {canBuild ? m.plan_empty_body_manage() : m.plan_empty_body_member()}
      </StatusMessage>
    )
  }

  const recalculating = creation.isPending
  // A recalculation can drop days; never point at one that is gone.
  const current = plan.days.some((candidate) => candidate.index === day)
    ? day
    : (plan.days[0]?.index ?? 1)

  return (
    <>
      {printing && <PlanPrintout plan={plan} trip={trip} />}
      <div className="flex flex-col gap-4 print:hidden" aria-busy={recalculating}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="flex flex-col text-sm leading-[22px]">
            <span className="font-medium">{m.plan_version({ n: plan.version })}</span>
            <PlanHashLabel hash={plan.plan_hash} />
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-full px-5"
              onClick={() => window.print()}
            >
              <Printer aria-hidden="true" />
              {m.plan_print()}
            </Button>
            {canBuild && (
              <Button
                variant="outline"
                className="h-11 rounded-full px-5"
                onClick={creation.create}
                disabled={recalculating}
              >
                <RefreshCcw
                  aria-hidden="true"
                  className={recalculating ? 'animate-spin' : undefined}
                />
                {recalculating ? m.plan_recomputing() : m.plan_recompute()}
              </Button>
            )}
          </div>
        </div>
        <div role="status" className={recalculating ? 'text-muted-foreground text-sm' : 'sr-only'}>
          {recalculating && m.plan_recomputing_status()}
        </div>
        <PlanSummary plan={plan} />
        {failure}
        <div className={recalculating ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <DayTabs
            days={plan.days}
            value={current}
            onValueChange={setDay}
            renderDay={(planDay) =>
              planDay.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">{m.plan_day_empty()}</p>
              ) : (
                <PlanTimeline stops={planDay.items} currency={plan.budget.currency} />
              )
            }
          />
        </div>
      </div>
    </>
  )
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick}>
      {m.action_retry()}
    </Button>
  )
}

function PlanSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <Skeleton className="h-11 w-full rounded-full" />
      <Skeleton className="h-7 w-1/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
