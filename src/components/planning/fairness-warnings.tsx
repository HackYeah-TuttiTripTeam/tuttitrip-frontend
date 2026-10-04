import { CircleAlert } from '@keyline-icons/react'
import type { FloorMiss, PlanConflict } from '@/api/queries/plans'
import { INTEREST_LABELS } from '@/components/profiles/interests-picker'
import { formatFixed } from '@/lib/format'
import { m } from '@/paraglide/messages'

interface FairnessWarningsProps {
  floorsMissed: FloorMiss[]
  conflicts: PlanConflict[]
  /** V(P): the penalty for the guarantees that were not met; 0 when nothing is missed. */
  violation: number
  /** Names by profile id and by place id, to write the reasons. */
  names: ReadonlyMap<string, string>
  placeNames: ReadonlyMap<string, string>
}

const VIOLATION_DIGITS = 2

const tagLabel = (tag: string) => INTEREST_LABELS[tag as keyof typeof INTEREST_LABELS]?.() ?? tag

function floorText(miss: FloorMiss, name: string): string {
  const shortfall = formatFixed(miss.shortfall, miss.kind === 'floor' ? 0 : VIOLATION_DIGITS)
  switch (miss.kind) {
    case 'floor':
      return m.warning_floor({ name, shortfall })
    case 'own_place_day':
      return miss.day != null
        ? m.warning_own_place_day({ name, day: miss.day })
        : m.warning_own_place_any_day({ name })
    case 'tag_minimum':
      return m.warning_tag_minimum({ name, tag: tagLabel(miss.tag ?? ''), shortfall })
  }
}

function conflictText(conflict: PlanConflict, people: string, place: string | undefined): string {
  switch (conflict.reason_code) {
    case 'lodging_hard_requirement':
      return m.warning_conflict_lodging({ people })
    case 'veto_blocks_place':
      return m.warning_conflict_veto({ place: place ?? '' })
    case 'budget_limit':
      return m.warning_conflict_budget()
    case 'floor_unreachable':
      return m.warning_conflict_floor({ people })
    case 'unknown_price':
      return m.warning_conflict_price()
    case 'other':
      return m.warning_conflict_other()
  }
}

/**
 * The guarantees the plan could not keep (`floors_missed`), the conflicts and the penalty
 * (`violation`), each with its reason in words and the person it concerns. Always visible: a plan
 * that misses something never hides it. With nothing missed it says so in one quiet line.
 */
export function FairnessWarnings({
  floorsMissed,
  conflicts,
  violation,
  names,
  placeNames,
}: FairnessWarningsProps) {
  if (floorsMissed.length === 0 && conflicts.length === 0 && violation <= 0) {
    return <p className="text-muted-foreground text-sm leading-[22px]">{m.warning_none()}</p>
  }

  const entries = [
    ...floorsMissed.map((miss) => ({
      key: `floor-${miss.kind}-${miss.profile_id}-${miss.day ?? ''}-${miss.tag ?? ''}`,
      text: floorText(miss, names.get(miss.profile_id) ?? ''),
    })),
    ...conflicts.map((conflict) => ({
      key: `conflict-${conflict.reason_code}-${conflict.place_id ?? ''}-${(conflict.profile_ids ?? []).join()}`,
      text: conflictText(
        conflict,
        (conflict.profile_ids ?? []).map((id) => names.get(id) ?? '').join(', '),
        conflict.place_id ? placeNames.get(conflict.place_id) : undefined,
      ),
    })),
  ]

  return (
    <section aria-labelledby="warnings-title" className="flex flex-col gap-2">
      <h3 id="warnings-title" className="font-heading font-semibold text-lg leading-6">
        {m.warning_title()}
      </h3>
      <ul className="flex flex-col gap-2">
        {entries.map(({ key, text }) => (
          <li
            key={key}
            className="flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning-ink leading-[22px]"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      {violation > 0 && (
        <p className="text-muted-foreground text-sm leading-[22px]">
          {m.warning_violation({ value: formatFixed(violation, VIOLATION_DIGITS) })}
        </p>
      )}
    </section>
  )
}
