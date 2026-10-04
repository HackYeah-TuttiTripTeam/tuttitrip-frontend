import { useState } from 'react'
import type { Plan } from '@/api/queries/plans'
import type { Trip } from '@/api/queries/trips'
import { FairnessAlphaSlider } from '@/components/planning/fairness-alpha-slider'
import { FairnessLedger } from '@/components/planning/fairness-ledger'
import { FairnessPanel } from '@/components/planning/fairness-panel'
import { FairnessWarnings } from '@/components/planning/fairness-warnings'
import { PersonWeightSlider } from '@/components/planning/person-weight-slider'
import { WeightPresets } from '@/components/planning/weight-presets'
import { Button } from '@/components/ui/button'
import { useUpdateFairnessAlpha } from '@/hooks/use-update-fairness-alpha'
import { useUpdateWeights } from '@/hooks/use-update-weights'
import { activeWeightPreset, defaultFocus, type PlanChange } from '@/lib/fairness'
import type { Person } from '@/lib/people'
import { m } from '@/paraglide/messages'

interface FairnessAsideProps {
  trip: Trip
  plan: Plan
  change: PlanChange | null
  people: Person[]
  meProfileId: string | null
  /** Names of the places of the plan, to write the conflicts. */
  placeNames: ReadonlyMap<string, string>
}

/**
 * The right panel of the plan (the drawer on a phone): the fairness measure, the warnings, the
 * host's ledger and the two things that move the numbers, the weights and the slider. Members see
 * the settings read-only; the API refuses their writes anyway.
 */
export function FairnessAside({
  trip,
  plan,
  change,
  people,
  meProfileId,
  placeNames,
}: FairnessAsideProps) {
  const canManage = trip.my_role !== 'member'
  const names = new Map(plan.fairness.per_person.map((person) => [person.profile_id, person.name]))

  return (
    <div className="flex flex-col gap-6">
      <FairnessPanel
        fairness={plan.fairness}
        change={change}
        currency={plan.budget.currency}
        meProfileId={meProfileId}
      />
      <FairnessWarnings
        floorsMissed={plan.floors_missed ?? []}
        conflicts={plan.conflicts ?? []}
        violation={plan.violation}
        names={names}
        placeNames={placeNames}
      />
      {canManage && <FairnessLedger fairness={plan.fairness} />}
      {plan.fairness.group_size > 1 && (
        <GroupTuning trip={trip} people={people} canManage={canManage} change={change} />
      )}
    </div>
  )
}

interface GroupTuningProps {
  trip: Trip
  people: Person[]
  canManage: boolean
  change: PlanChange | null
}

function GroupTuning({ trip, people, canManage, change }: GroupTuningProps) {
  const weights = useUpdateWeights(trip.id)
  const alpha = useUpdateFairnessAlpha(trip)
  // "Plan unchanged" belongs to the slider only right after the slider moved the plan.
  const [alphaMoved, setAlphaMoved] = useState(false)
  const profiles = people.map((person) => person.profile)
  const active = activeWeightPreset(profiles)
  const busy = weights.isPending || alpha.isPending
  const failed = weights.error ?? alpha.error

  return (
    <section aria-labelledby="tuning-title" className="flex flex-col gap-5">
      <h3 id="tuning-title" className="font-heading font-semibold text-lg leading-6">
        {m.weights_title()}
      </h3>
      <p className="text-muted-foreground text-sm leading-[22px]">{m.weights_hint()}</p>
      <WeightPresets
        active={active?.preset ?? null}
        focusId={active?.focusId ?? defaultFocus(profiles)}
        people={profiles.map((profile) => ({ id: profile.id, name: profile.display_name }))}
        disabled={!canManage || busy}
        onPreset={(preset, focusProfileId) => {
          setAlphaMoved(false)
          weights.change({ preset, focusProfileId })
        }}
      />
      <ul className="flex flex-col gap-3">
        {profiles.map((profile) => (
          <PersonWeightSlider
            key={profile.id}
            name={profile.display_name}
            weight={profile.weight}
            readOnly={!canManage}
            disabled={busy}
            onCommit={(weight) => {
              setAlphaMoved(false)
              weights.change({ profileId: profile.id, weight })
            }}
          />
        ))}
      </ul>
      <FairnessAlphaSlider
        value={trip.fairness_alpha}
        readOnly={!canManage}
        busy={busy}
        unchanged={alphaMoved && !busy && change?.unchanged === true}
        onCommit={(next) => {
          setAlphaMoved(true)
          alpha.commit(next)
        }}
      />
      {busy && (
        <p role="status" className="text-muted-foreground text-sm">
          {m.plan_recomputing_status()}
        </p>
      )}
      {failed && !busy && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-destructive">{m.weights_failed()}</span>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full"
            onClick={weights.error ? weights.retry : alpha.retry}
          >
            {m.veto_retry()}
          </Button>
        </div>
      )}
    </section>
  )
}
