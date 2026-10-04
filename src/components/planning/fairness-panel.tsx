import { cn } from 'cn'
import type { PersonFairness, PlanFairness } from '@/api/queries/plans'
import { floorShare, type PlanChange, percentOf } from '@/lib/fairness'
import { formatFixed, formatMoneyDelta, formatSigned } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { DOMAIN_LABELS, DomainChart } from './domain-chart'

/** Decimal places of the Jain index: "0,94". */
const JAIN_DIGITS = 2

interface FairnessPanelProps {
  fairness: PlanFairness
  /** How the numbers moved since the version before; null when there is no earlier version. */
  change: PlanChange | null
  /** Currency of the plan, for the cost change. */
  currency: string
  /** The signed-in person's profile, so the bar can say "your maximum". */
  meProfileId: string | null
}

/**
 * The fairness measure next to the plan: for a group a bar per person ("87% of their maximum"),
 * the least satisfied person and the Jain index; for one person the five domains and the weakest
 * one instead (Jain is always 1 there, which says nothing). The numbers come from the API.
 */
export function FairnessPanel({ fairness, change, currency, meProfileId }: FairnessPanelProps) {
  const [only] = fairness.per_person
  const solo = fairness.group_size === 1 && only !== undefined

  return (
    <section aria-labelledby="fairness-title" className="flex flex-col gap-4">
      <h2 id="fairness-title" className="font-heading font-semibold text-[22px] leading-7">
        {solo ? m.fairness_title_solo() : m.fairness_title()}
      </h2>
      {solo ? (
        <SoloDomains person={only} />
      ) : (
        <GroupBars fairness={fairness} change={change} meProfileId={meProfileId} />
      )}
      {change && <PlanChangeSummary change={change} currency={currency} />}
      {!solo && (
        <details className="text-muted-foreground text-sm leading-[22px]">
          <summary className="min-h-11 cursor-pointer py-2.5 font-medium text-foreground">
            {m.fairness_explain_summary()}
          </summary>
          <p>{m.fairness_explain_bars()}</p>
          <p className="mt-2">{m.fairness_explain_jain()}</p>
        </details>
      )}
    </section>
  )
}

function SoloDomains({ person }: { person: PersonFairness }) {
  const weakest = person.weakest_domain
  const weakestScore = person.domains.find((domain) => domain.domain === weakest)?.q
  return (
    <>
      <p className="text-muted-foreground text-sm leading-[22px]">{m.fairness_solo_intro()}</p>
      <DomainChart domains={person.domains} weakest={weakest} />
      {weakest && weakestScore != null && (
        <p className="text-sm leading-[22px]">
          {m.fairness_solo_weakest({
            domain: DOMAIN_LABELS[weakest](),
            score: formatFixed(weakestScore, 0),
          })}
        </p>
      )}
    </>
  )
}

interface GroupBarsProps {
  fairness: PlanFairness
  change: PlanChange | null
  meProfileId: string | null
}

function GroupBars({ fairness, change, meProfileId }: GroupBarsProps) {
  const people = fairness.per_person.toSorted((a, b) => b.r - a.r)
  const least = people.at(-1)

  return (
    <>
      <dl className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-sm leading-[22px]">{m.fairness_min_r()}</dt>
          <dd className="font-heading font-extrabold text-[40px] tabular-nums leading-10">
            {m.fairness_percent({ pct: percentOf(fairness.min_r) })}
          </dd>
          {change && (
            <dd className="font-medium text-sm tabular-nums">
              {change.minR === 0
                ? m.fairness_no_change()
                : m.fairness_points({ delta: formatSigned(change.minR) })}
            </dd>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-sm leading-[22px]">{m.fairness_jain()}</dt>
          <dd className="font-heading font-extrabold text-[40px] tabular-nums leading-10">
            {formatFixed(fairness.jain, JAIN_DIGITS)}
          </dd>
          <dd className="text-muted-foreground text-sm">{m.fairness_jain_hint()}</dd>
        </div>
      </dl>
      {least && (
        <p className="text-sm leading-[22px]">
          {m.fairness_least({ name: least.name, pct: percentOf(least.r) })}
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {people.map((person) => (
          <PersonBar
            key={person.profile_id}
            person={person}
            isMe={person.profile_id === meProfileId}
            delta={change?.perPerson.get(person.profile_id) ?? null}
          />
        ))}
      </ul>
    </>
  )
}

interface PersonBarProps {
  person: PersonFairness
  isMe: boolean
  /** Change of `r` in percentage points since the version before. */
  delta: number | null
}

function PersonBar({ person, isMe, delta }: PersonBarProps) {
  const pct = percentOf(person.r)
  const floorPct = percentOf(floorShare(person.floor_eff, person.u_star))
  const hasFloor = person.floor_eff > 0
  const of = isMe ? m.fairness_of_yours({ pct }) : m.fairness_of_theirs({ pct })

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{person.name}</span>
        <span className="flex items-baseline gap-2 font-heading font-semibold tabular-nums">
          {of}
          {delta !== null && delta !== 0 && (
            <span className="font-medium text-muted-foreground text-sm">
              {m.fairness_points({ delta: formatSigned(delta) })}
            </span>
          )}
        </span>
      </div>
      <div
        role="img"
        aria-label={`${person.name}: ${of}`}
        className="relative h-3 rounded-full bg-muted"
      >
        <span
          className={cn(
            'block h-full rounded-full',
            person.floor_met ? 'bg-primary' : 'bg-decline',
          )}
          style={{ width: `${pct}%` }}
        />
        {hasFloor && (
          <span
            aria-hidden="true"
            className="absolute -top-1 h-5 w-0.5 rounded-full bg-foreground"
            style={{ left: `${floorPct}%` }}
          />
        )}
      </div>
      {hasFloor && (
        <p className="text-muted-foreground text-sm leading-[22px]">
          {person.floor_met
            ? m.fairness_floor_met({ floor: formatFixed(person.floor_eff, 0) })
            : m.fairness_floor_missed({
                floor: formatFixed(person.floor_eff, 0),
                u: formatFixed(person.u, 0),
              })}
        </p>
      )}
    </li>
  )
}

function PlanChangeSummary({ change, currency }: { change: PlanChange; currency: string }) {
  if (change.unchanged) {
    return (
      <p className="text-muted-foreground text-sm leading-[22px]">{m.fairness_plan_unchanged()}</p>
    )
  }
  return (
    <p className="text-muted-foreground text-sm leading-[22px]">
      {m.fairness_plan_changed({
        cost: formatMoneyDelta(change.cost, currency),
        time: m.fairness_minutes({ delta: formatSigned(change.transferMinutes) }),
      })}
    </p>
  )
}
