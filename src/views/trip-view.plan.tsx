import {
  Calendar,
  CloudOff,
  KeyRound,
  Printer,
  RefreshCcw,
  TriangleAlert,
  Users,
} from '@keyline-icons/react'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import type { Plan } from '@/api/queries/plans'
import type { Trip } from '@/api/queries/trips'
import { DayCost } from '@/components/planning/cost-breakdown'
import { DayTabs } from '@/components/planning/day-tabs'
import { DraftBanner } from '@/components/planning/draft-banner'
import { MissingInputsDialog } from '@/components/planning/missing-inputs-dialog'
import { PlanHashLabel } from '@/components/planning/plan-hash-label'
import { PlanPrintout } from '@/components/planning/plan-printout'
import { PlanProgress } from '@/components/planning/plan-progress'
import { PlanSummary } from '@/components/planning/plan-summary'
import { VerdictChip } from '@/components/planning/verdict-chip'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreatePlan } from '@/hooks/use-create-plan'
import { useDraftAssumptions } from '@/hooks/use-draft-plan'
import { useFairness } from '@/hooks/use-fairness'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useMissingInputs } from '@/hooks/use-missing-inputs'
import { usePlaceFeedback } from '@/hooks/use-place-feedback'
import { usePlan } from '@/hooks/use-plan'
import { usePlanProgress } from '@/hooks/use-plan-progress'
import { usePrinting } from '@/hooks/use-printing'
import { useProfiles } from '@/hooks/use-profiles'
import { useSession } from '@/hooks/use-session'
import { useVerdicts } from '@/hooks/use-verdict'
import { percentOf } from '@/lib/fairness'
import { TOUR } from '@/lib/help'
import { dayCost, dayTickets } from '@/lib/plan-cost'
import { PLAN_FAILURE_TEXT } from '@/lib/plan-failure'
import { m } from '@/paraglide/messages'
import { PlanConsent } from './trip-view.consent'
import { PlanDecisions } from './trip-view.decisions'
import { FairnessAside } from './trip-view.fairness'
import { TripPlanProposal } from './trip-view.plan.proposal'
import { PlanDayPanel } from './trip-view.plan-day'
import { StopActions } from './trip-view.stop-actions'

const route = getRouteApi('/trips_/$tripId')

interface TripPlanViewProps {
  trip: Trip
}

/** The Plan tab: the latest plan day by day, or the empty state with "Build plan". */
export function TripPlanView({ trip }: TripPlanViewProps) {
  const { id: tripId, my_role: role } = trip
  const printing = usePrinting()
  const { plan, isPending, isRecalculating, hasNoPlan, forbidden, problem, refetch } =
    usePlan(tripId)
  const creation = useCreatePlan(tripId)
  const missing = useMissingInputs({
    trip,
    failure: creation.failure,
    error: creation.error,
    retry: () => creation.create(),
  })
  const progress = usePlanProgress(tripId, creation.isPending || isRecalculating)
  const session = useSession()
  const { people } = useProfiles(tripId, session.status)
  const feedback = usePlaceFeedback(tripId)
  const { ratings, vetoes } = feedback
  const { change } = useFairness(tripId, plan)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const assumptions = useDraftAssumptions(tripId, plan?.id)
  const [day, setDay] = useState(1)
  const [fairnessOpen, setFairnessOpen] = useState(false)
  const [verdictPlace, setVerdictPlace] = useState<string | null>(null)
  const verdicts = useVerdicts(plan)
  const { view } = route.useSearch()
  const navigate = route.useNavigate()
  const setView = (next: typeof view) =>
    void navigate({ search: (prev) => ({ ...prev, view: next }), replace: true })
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

  const failure =
    creation.failure && !missing.open ? (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-destructive text-sm">
          {PLAN_FAILURE_TEXT[creation.failure.kind]()}
        </p>
        {missing.current && (
          <Button variant="outline" className="h-11 rounded-full px-5" onClick={missing.reopen}>
            {m.plan_missing_reopen()}
          </Button>
        )}
      </div>
    ) : null
  const dialog = missing.current ? (
    <MissingInputsDialog
      open={missing.open}
      onOpenChange={(open) => (open ? missing.reopen() : missing.dismiss())}
      isDesktop={isDesktop}
      input={missing.current}
      step={missing.step}
      total={missing.total}
      pending={missing.pending}
      problem={missing.problem}
      citySearch={missing.citySearch}
      onAnswer={(input, value) => void missing.answer(input, value)}
    />
  ) : null

  if (hasNoPlan || !plan) {
    return (
      <div data-tour={TOUR.planEmpty}>
        {dialog}
        <StatusMessage
          icon={<Calendar />}
          title={m.plan_empty_title()}
          action={
            <div className="flex flex-col items-start gap-3 md:items-center">
              {canBuild && (
                <Button
                  size="lg"
                  className="h-11 rounded-full px-6"
                  onClick={() => creation.create()}
                  disabled={creation.isPending}
                >
                  {creation.isPending ? m.plan_computing() : m.plan_compute()}
                </Button>
              )}
              {(creation.isPending || isRecalculating) && <PlanProgress progress={progress} />}
              {failure}
            </div>
          }
        >
          {canBuild ? m.plan_empty_body_manage() : m.plan_empty_body_member()}
        </StatusMessage>
      </div>
    )
  }

  const recalculating = isRecalculating
  const meProfileId = people.find((person) => person.isMe)?.profile.id ?? null
  const names = new Map(plan.fairness.per_person.map((person) => [person.profile_id, person.name]))
  const placeNames = new Map(
    plan.days.flatMap((planDay) => planDay.items.map((stop) => [stop.place_id, stop.name])),
  )
  const aside = (
    <FairnessAside
      trip={trip}
      plan={plan}
      change={change}
      people={people}
      meProfileId={meProfileId}
      placeNames={placeNames}
    />
  )
  // A recalculation can drop days; never point at one that is gone.
  const current = plan.days.some((candidate) => candidate.index === day)
    ? day
    : (plan.days[0]?.index ?? 1)

  return (
    <>
      {dialog}
      {printing && <PlanPrintout plan={plan} trip={trip} />}
      <div
        className="grid gap-6 md:grid-cols-[minmax(0,1fr)_23rem] md:gap-10 print:hidden"
        aria-busy={recalculating}
      >
        <div className="flex min-w-0 flex-col gap-4">
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
              {canBuild && (
                <Button
                  variant="outline"
                  className="h-11 rounded-full px-5"
                  onClick={() => creation.create()}
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
          <div
            role="status"
            className={recalculating ? 'text-muted-foreground text-sm' : 'sr-only'}
          >
            {recalculating && m.plan_recomputing_status()}
          </div>
          {recalculating && <PlanProgress progress={progress} />}
          {plan.params.draft && <DraftBanner assumptions={assumptions} />}
          <TripPlanProposal tripId={tripId} canManage={canBuild} plan={plan} />
          <div data-tour={TOUR.planSummary}>
            <PlanSummary plan={plan} />
          </div>
          <PlanConsent plan={plan} trip={trip} />
          {!isDesktop && <FairnessSummary plan={plan} onOpen={() => setFairnessOpen(true)} />}
          {failure}
          {feedback.failed && (
            <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-destructive">{m.feedback_failed()}</span>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full"
                onClick={feedback.refetch}
              >
                {m.feedback_retry()}
              </Button>
            </div>
          )}
          <div
            className={recalculating ? 'opacity-60 transition-opacity' : 'transition-opacity'}
            data-tour={TOUR.planDays}
          >
            <DayTabs
              days={plan.days}
              value={current}
              onValueChange={setDay}
              renderDayMeta={(planDay) => (
                <DayCost
                  cost={dayCost(planDay, plan.fairness.group_size)}
                  currency={plan.budget.currency}
                  tickets={dayTickets(plan.transit_tickets, planDay.index)}
                />
              )}
              renderDay={(planDay) =>
                planDay.items.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{m.plan_day_empty()}</p>
                ) : (
                  <PlanDayPanel
                    key={planDay.index}
                    day={planDay}
                    currency={plan.budget.currency}
                    view={view}
                    onViewChange={setView}
                    renderStopActions={(stop) => (
                      <>
                        {verdicts.byPlace.get(stop.place_id) && (
                          <div>
                            <VerdictChip
                              verdict={verdicts.byPlace.get(stop.place_id)?.verdict ?? 'fits'}
                              onClick={() => setVerdictPlace(stop.place_id)}
                            />
                          </div>
                        )}
                        <StopActions
                          tripId={tripId}
                          stop={stop}
                          currency={plan.budget.currency}
                          names={names}
                          meProfileId={meProfileId}
                          canActForOthers={canBuild}
                          ratings={ratings}
                          vetoes={vetoes}
                          feedbackReady={!feedback.failed}
                          isDesktop={isDesktop}
                        />
                      </>
                    )}
                  />
                )
              }
            />
          </div>
          <PlanDecisions
            plan={plan}
            trip={trip}
            index={verdicts}
            verdictPlace={verdictPlace}
            onVerdictPlace={setVerdictPlace}
            onShowOnPlan={(placeId) => {
              const found = plan.days.find((planDay) =>
                planDay.items.some((stop) => stop.place_id === placeId),
              )
              if (found) setDay(found.index)
            }}
          />
        </div>
        {isDesktop && (
          <aside
            aria-label={m.fairness_aside_label()}
            className="md:sticky md:top-6 md:max-h-[calc(100dvh-3rem)] md:self-start md:overflow-y-auto md:pr-1"
          >
            {aside}
          </aside>
        )}
      </div>
      {!isDesktop && (
        <ResponsiveModal
          open={fairnessOpen}
          onOpenChange={setFairnessOpen}
          isDesktop={false}
          title={m.fairness_aside_label()}
          description={m.fairness_aside_description()}
        >
          <div className="pb-6">{aside}</div>
        </ResponsiveModal>
      )}
    </>
  )
}

/** Phones: one line that opens the fairness panel in a drawer. */
function FairnessSummary({ plan, onOpen }: { plan: Plan; onOpen: () => void }) {
  const { fairness } = plan
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto min-h-12 justify-between rounded-2xl px-4 py-2.5 text-left whitespace-normal"
      onClick={onOpen}
    >
      <span className="flex flex-col">
        <span className="font-medium">{m.fairness_aside_label()}</span>
        <span className="font-normal text-muted-foreground text-sm">
          {fairness.group_size > 1
            ? m.fairness_summary_group({ pct: percentOf(fairness.min_r) })
            : m.fairness_summary_solo()}
        </span>
      </span>
      <Users aria-hidden="true" />
    </Button>
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
