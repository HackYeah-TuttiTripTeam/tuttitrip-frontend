import type { DecisionEffects } from '@/api/queries/decisions'
import { JAIN_DELTA_DIGITS } from '@/lib/constants'
import { formatSigned, formatSignedDecimal, formatSignedMinutes } from '@/lib/format'
import { m } from '@/paraglide/messages'

/** "min r −0,04 · budżet +120 zł · czas +25 min": the three numbers of a decision, in one line. */
export function effectsSummary(effects: DecisionEffects, currency: string): string {
  return m.decision_effects_line({
    minR: formatSigned(effects.d_min_r),
    cost: formatSignedDecimal(effects.d_cost, currency),
    time: formatSignedMinutes(effects.d_minutes),
  })
}

interface DecisionEffectsLineProps {
  effects: DecisionEffects
  currency: string
}

/** The one-line cost of a decision in a fixed-width face. */
export function DecisionEffectsLine({ effects, currency }: DecisionEffectsLineProps) {
  return <p className="font-mono text-[13px] tabular-nums">{effectsSummary(effects, currency)}</p>
}

interface PersonDeltasProps {
  effects: DecisionEffects
  /** Display name by profile id. */
  names: ReadonlyMap<string, string>
}

/** The change of `r` for each person: who pays for the decision in fairness. */
export function PersonDeltas({ effects, names }: PersonDeltasProps) {
  if (effects.d_r.length === 0) return null
  return (
    <section>
      <h3 className="font-medium text-sm">{m.decision_effects_people()}</h3>
      <ul className="mt-1 divide-y">
        {effects.d_r.map((delta) => (
          <li key={delta.profile_id} className="flex items-baseline justify-between gap-4 py-1.5">
            <span className="text-sm">{names.get(delta.profile_id) ?? m.verdict_someone()}</span>
            <span className="font-mono text-sm tabular-nums">{formatSigned(delta.d_r)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-muted-foreground text-xs">
        {m.decision_effects_jain({ value: formatSigned(effects.d_jain, JAIN_DELTA_DIGITS) })}
      </p>
    </section>
  )
}
