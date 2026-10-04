import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { ApiError } from '@/api/errors'
import type { OverrideKind } from '@/api/queries/decisions'
import type { Plan } from '@/api/queries/plans'
import type { Trip } from '@/api/queries/trips'
import { DecisionLog } from '@/components/planning/decision-log'
import { OverrideDialog } from '@/components/planning/override-dialog'
import { SkippedPlaces } from '@/components/planning/skipped-places'
import { VerdictSheet } from '@/components/planning/verdict-sheet'
import { useApplyOverride } from '@/hooks/use-apply-override'
import { useCatalogPlaces } from '@/hooks/use-catalog-places'
import { useDecisionLog } from '@/hooks/use-decision-log'
import { useClampPage, useListSearch } from '@/hooks/use-list-search'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useOverridePreview } from '@/hooks/use-override-preview'
import { useProfiles } from '@/hooks/use-profiles'
import { useSession } from '@/hooks/use-session'
import { conflictMessages } from '@/lib/decisions'
import type { VerdictIndex } from '@/lib/verdicts'
import { decisionLogFilterDefaults } from '@/loaders/trip'
import { m } from '@/paraglide/messages'

const route = getRouteApi('/trips_/$tripId')

interface PlanDecisionsProps {
  plan: Plan
  trip: Trip
  /** Verdicts by place, computed once by the plan view. */
  index: VerdictIndex
  /** The place whose verdict is open (a chip was touched), or null. */
  verdictPlace: string | null
  onVerdictPlace: (placeId: string | null) => void
  onShowOnPlan: (placeId: string) => void
}

interface OverrideTarget {
  placeId: string
  kind: OverrideKind
}

/**
 * Everything the plan shows about decisions: the places it left out, the verdict sheet, the host's
 * override with its price, and the log. The chips themselves sit in the timeline.
 */
export function PlanDecisions({
  plan,
  trip,
  index,
  verdictPlace,
  onVerdictPlace,
  onShowOnPlan,
}: PlanDecisionsProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const session = useSession()
  const canOverride = trip.my_role === 'host'
  const { currency } = plan.budget

  const catalog = useCatalogPlaces(trip.city_slug, true)
  const { people } = useProfiles(trip.id, session.status)

  const planStops = new Map(
    plan.days.flatMap((day) => day.items).map((stop) => [stop.place_id, stop]),
  )
  const placeName = (placeId: string) =>
    planStops.get(placeId)?.name ??
    catalog.find((place) => place.id === placeId)?.name ??
    m.verdict_unknown_place()
  const names = new Map(plan.fairness.per_person.map((person) => [person.profile_id, person.name]))
  const authors = new Map(
    people.flatMap(({ profile }) =>
      profile.user_sub ? [[profile.user_sub, profile.display_name]] : [],
    ),
  )

  const verdict = verdictPlace ? (index.byPlace.get(verdictPlace) ?? null) : null
  const substituteId = verdict?.substitute_place_id ?? null

  // The host's decision: the sheet closes, the dialog shows the price, "Zatwierdź" saves.
  const [target, setTarget] = useState<OverrideTarget | null>(null)
  const [reason, setReason] = useState('')
  const preview = useOverridePreview(trip.id)
  const override = useApplyOverride(trip.id)

  const openOverride = (placeId: string, kind: OverrideKind) => {
    setTarget({ placeId, kind })
    setReason('')
    override.reset()
    preview.preview(placeId, kind)
    onVerdictPlace(null)
  }
  const changeKind = (kind: OverrideKind) => {
    if (!target) return
    setTarget({ ...target, kind })
    override.reset()
    preview.preview(target.placeId, kind)
  }
  const close = () => {
    setTarget(null)
    preview.reset()
    override.reset()
  }
  const confirm = () => {
    if (!target) return
    override
      .apply({ placeId: target.placeId, kind: target.kind, reason })
      .then(close)
      .catch(() => undefined)
  }
  const failure = override.error ?? preview.error
  const conflicts = conflictMessages(failure)

  // The decision log lives in the URL like every list.
  const { search, setPage, setSize, setFilters } = useListSearch(route, {
    filterDefaults: decisionLogFilterDefaults,
  })
  const logSearch = {
    page: search.page,
    size: search.size,
    sort: search.sort,
    dir: search.dir,
    kind: search.kind,
  }
  const log = useDecisionLog(trip.id, logSearch)
  useClampPage(search.page, log.pages, setPage)

  return (
    <>
      <SkippedPlaces skipped={index.skipped} placeName={placeName} onOpen={onVerdictPlace} />

      <section aria-label={m.decision_log_title()} className="border-t pt-4">
        <DecisionLog
          decisions={log.decisions}
          currency={currency}
          authorName={(sub) => authors.get(sub) ?? null}
          placeName={placeName}
          kind={search.decision}
          dir={search.dir}
          profileName={(profileId) => names.get(profileId) ?? null}
          page={search.page}
          size={search.size}
          pages={log.pages}
          total={log.total}
          isPending={log.isPending}
          isPlaceholder={log.isPlaceholder}
          failed={log.problem !== null}
          onKindChange={(decision) => setFilters({ decision })}
          onDirChange={(dir) => setFilters({ dir })}
          onPageChange={setPage}
          onSizeChange={setSize}
          onRetry={log.refetch}
        />
      </section>

      <VerdictSheet
        verdict={verdict}
        placeName={verdict ? placeName(verdict.place_id) : ''}
        isDesktop={isDesktop}
        names={names}
        explain={verdict ? (index.explainByPlace.get(verdict.place_id) ?? []) : []}
        substituteName={substituteId ? placeName(substituteId) : null}
        inPlan={verdict ? planStops.has(verdict.place_id) : false}
        canOverride={canOverride}
        onClose={() => onVerdictPlace(null)}
        onOverride={openOverride}
        onShowOnPlan={(placeId) => {
          onVerdictPlace(null)
          onShowOnPlan(placeId)
        }}
      />

      <OverrideDialog
        target={target ? { placeName: placeName(target.placeId), kind: target.kind } : null}
        isDesktop={isDesktop}
        currency={currency}
        effects={preview.effects}
        previewPending={preview.isPending}
        names={names}
        reason={reason}
        applyPending={override.isPending}
        error={failure && conflicts.length === 0 ? overrideError(failure) : null}
        conflicts={conflicts}
        onKindChange={changeKind}
        onReasonChange={setReason}
        onConfirm={confirm}
        onCancel={close}
      />
    </>
  )
}

function overrideError(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) return m.override_forbidden()
  if (error instanceof ApiError && error.status === 422) return m.override_unprocessable()
  return m.override_failed()
}
