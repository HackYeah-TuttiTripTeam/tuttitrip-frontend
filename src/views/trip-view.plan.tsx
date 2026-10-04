import {
  Calendar,
  CloudOff,
  KeyRound,
  Printer,
  RefreshCcw,
  TriangleAlert,
} from '@keyline-icons/react'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { ApiError } from '@/api/errors'
import { SHOWCASE_CITY_SLUGS } from '@/api/queries/places'
import type { Trip } from '@/api/queries/trips'
import { CityFetchStatus } from '@/components/places/city-fetch-status'
import { OsmAttribution } from '@/components/places/osm-attribution'
import { DayTabs } from '@/components/planning/day-tabs'
import { PendingReplans } from '@/components/planning/pending-replans'
import { PlanHashLabel } from '@/components/planning/plan-hash-label'
import { PlanPrintout } from '@/components/planning/plan-printout'
import { PlanSummary } from '@/components/planning/plan-summary'
import { PlanTimeline } from '@/components/planning/plan-timeline'
import { ReplanButton } from '@/components/planning/replan-button'
import { ReplanDiff } from '@/components/planning/replan-diff'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useCityCandidates } from '@/hooks/use-city-candidates'
import { useCreatePlan } from '@/hooks/use-create-plan'
import { useDemoStatus } from '@/hooks/use-demo-session'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { usePendingApprovals } from '@/hooks/use-pending-approvals'
import { usePlan } from '@/hooks/use-plan'
import { usePrinting } from '@/hooks/use-printing'
import { TOUR } from '@/lib/help'
import { useReplan } from '@/hooks/use-replan'
import { PLAN_VIEWS, type PlanView } from '@/lib/trip-tabs'
import { m } from '@/paraglide/messages'
import { TripLintView } from './trip-view.lint'

const route = getRouteApi('/trips_/$tripId')

const VIEW_LABELS: Record<PlanView, () => string> = {
  plan: m.plan_view_plan,
  check: m.plan_view_check,
}

interface TripPlanViewProps {
  trip: Trip
}

/** The Plan tab: the plan day by day, or the check of a plan pasted from a chatbot (`?view=check`). */
export function TripPlanView({ trip }: TripPlanViewProps) {
  const { view } = route.useSearch()
  const navigate = route.useNavigate()
  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        type="single"
        value={view}
        aria-label={m.plan_views_label()}
        onValueChange={(value) => {
          const next = PLAN_VIEWS.find((candidate) => candidate === value)
          if (next) {
            void navigate({
              search: (prev) => ({ ...prev, view: next, paste: undefined }),
              replace: true,
            })
          }
        }}
        className="w-full print:hidden md:w-fit"
      >
        {PLAN_VIEWS.map((value) => (
          <ToggleGroupItem key={value} value={value} className="md:px-6">
            {VIEW_LABELS[value]()}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {view === 'check' ? <TripLintView trip={trip} /> : <PlanBody trip={trip} />}
    </div>
  )
}

/** The latest plan day by day, or the empty state with "Build plan". */
function PlanBody({ trip }: TripPlanViewProps) {
  const { id: tripId, my_role: role } = trip
  const printing = usePrinting()
  const { plan, isPending, hasNoPlan, forbidden, problem, refetch } = usePlan(tripId)
  const creation = useCreatePlan(tripId)
  // Places for a new city arrived: compute the plan without a reload.
  const candidates = useCityCandidates(tripId, creation.missing, creation.create)
  const [day, setDay] = useState(1)
  const canBuild = role !== 'member'
  // "Rain" (post-MVP, backend #74): any member replans the rest of a day; the host decides on
  // changes of members that touch other people.
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const { as_of: simulatedNow } = route.useSearch()
  const isDemo = useDemoStatus() === 'active'
  const replan = useReplan(tripId, plan?.id)
  const approvals = usePendingApprovals(tripId, canBuild && plan !== undefined)
  const [replanOpen, setReplanOpen] = useState(false)
  const rain = (planDay: number) => {
    setReplanOpen(true)
    replan.replan(planDay, isDemo ? simulatedNow : undefined)
  }

  if (creation.missing) {
    return (
      <CityFetchStatus
        phase={candidates.phase}
        cityName={trip.destination}
        percent={candidates.percent}
        placesCount={candidates.placesCount}
        failure={candidates.failure}
        isRetrying={candidates.isRetrying}
        onRetry={candidates.retry}
      />
    )
  }

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
      <div data-tour={TOUR.planEmpty}>
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
      </div>
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
      <div className="flex flex-col gap-4 pb-20 print:hidden md:pb-0" aria-busy={recalculating}>
        <div
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
          data-tour={TOUR.planActions}
        >
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
            <ReplanButton
              onClick={() => rain(current)}
              isPending={replan.isPending}
              className="hidden h-11 rounded-full px-5 md:inline-flex"
            />
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
        <div data-tour={TOUR.planSummary}>
          <PlanSummary plan={plan} />
        </div>
        <PendingReplans
          replans={approvals.pending}
          busyId={approvals.busyId}
          error={approvals.error}
          onApprove={approvals.approve}
          onReject={approvals.reject}
        />
        {/* The places of a city outside the team's sheet come from OpenStreetMap (ODbL). */}
        {trip.city_slug !== null && !SHOWCASE_CITY_SLUGS.includes(trip.city_slug) && (
          <OsmAttribution />
        )}
        {failure}
        <div
          className={recalculating ? 'opacity-60 transition-opacity' : 'transition-opacity'}
          data-tour={TOUR.planDays}
        >
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

      {/* Phones: the day's main action sits in a bar above the tab bar of the app shell. */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-background px-4 py-2 print:hidden md:hidden">
        <ReplanButton
          onClick={() => rain(current)}
          isPending={replan.isPending}
          className="h-11 w-full"
        />
      </div>

      <ResponsiveModal
        open={replanOpen}
        onOpenChange={(open) => {
          setReplanOpen(open)
          if (!open) replan.reset()
        }}
        isDesktop={isDesktop}
        title={m.replan_title({ day: current })}
        description={m.replan_description()}
      >
        <div
          className="flex flex-col gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          aria-live="polite"
        >
          {replan.isPending && (
            <p role="status" className="text-sm">
              {m.replan_working()}
            </p>
          )}
          {replan.error && (
            <>
              <p role="alert" className="text-destructive text-sm">
                {replan.error}
              </p>
              <Button variant="outline" onClick={() => rain(current)} className="h-11 md:h-9">
                {m.action_retry()}
              </Button>
            </>
          )}
          {replan.result && (
            <>
              <p role="status" className="font-medium text-sm">
                {replan.result.status === 'active'
                  ? m.replan_applied()
                  : m.replan_waiting_for_host()}
              </p>
              <ReplanDiff changes={replan.result.changes} />
            </>
          )}
        </div>
      </ResponsiveModal>
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
