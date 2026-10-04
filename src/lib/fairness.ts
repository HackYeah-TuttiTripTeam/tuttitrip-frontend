import type { Plan, PlanFairness } from '@/api/queries/plans'
import type { Profile } from '@/api/queries/profiles'
import { PERCENT, R_OFFSET, WEIGHT_MIN, WEIGHT_RAISED } from './constants'

export type WeightPresetId = 'po_rowno' | 'pod_dzieci' | 'dzien_babci'

const YOUNG_GROUPS: Profile['age_group'][] = ['toddler', 'child']

export const percentOf = (share: number) => Math.round(share * PERCENT)

/** Where the effective floor sits on the `r` axis of a person's bar: the same E4 formula as `r`. */
export function floorShare(floorEff: number, uStar: number): number {
  return Math.min(1, (floorEff + R_OFFSET) / (uStar + R_OFFSET))
}

/**
 * The preset the stored weights match, or null for a custom setting. The API does not store the
 * preset, only the weights it produced, so this mirrors its three presets (weight_presets.py).
 */
export function activeWeightPreset(
  profiles: Profile[],
): { preset: WeightPresetId; focusId: string | null } | null {
  if (profiles.length === 0) return null
  const raised = profiles.filter((profile) => profile.weight === WEIGHT_RAISED)
  const others = profiles.filter((profile) => profile.weight !== WEIGHT_RAISED)
  if (profiles.every((profile) => profile.weight === profiles[0]?.weight)) {
    return { preset: 'po_rowno', focusId: null }
  }
  if (others.some((profile) => profile.weight !== WEIGHT_MIN)) return null
  const young = profiles.filter((profile) => YOUNG_GROUPS.includes(profile.age_group))
  if (young.length > 0 && raised.length === young.length && young.every((p) => raised.includes(p)))
    return { preset: 'pod_dzieci', focusId: null }
  const [only] = raised
  return raised.length === 1 && only ? { preset: 'dzien_babci', focusId: only.id } : null
}

/** Whom "Dzień babci" raises by default: the oldest senior, else the oldest person. */
export function defaultFocus(profiles: Profile[]): string | null {
  const byAge = profiles.toSorted((a, b) => b.age - a.age)
  return (byAge.find((profile) => profile.age_group === 'senior') ?? byAge[0])?.id ?? null
}

/** What changed between two versions of a plan, as the panel shows it. */
export interface PlanChange {
  /** `min r` in percentage points. */
  minR: number
  /** `r` per person in percentage points. */
  perPerson: Map<string, number>
  /** Plan cost, in the plan currency. */
  cost: number
  /** Time spent on the way, in minutes. */
  transferMinutes: number
  /** The recalculation gave the same plan (same `plan_hash`). */
  unchanged: boolean
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

/** Minutes spent between places over the whole plan. */
export const transferMinutes = (plan: Plan): number =>
  sum(plan.days.flatMap((day) => day.items.map((stop) => stop.transfer?.minutes ?? 0)))

const ratios = (fairness: PlanFairness) =>
  new Map(fairness.per_person.map((person) => [person.profile_id, person.r]))

export function planChange(before: Plan, after: Plan): PlanChange {
  const earlier = ratios(before.fairness)
  const perPerson = new Map(
    after.fairness.per_person.map((person) => [
      person.profile_id,
      percentOf(person.r) - percentOf(earlier.get(person.profile_id) ?? person.r),
    ]),
  )
  const minR = percentOf(after.fairness.min_r) - percentOf(before.fairness.min_r)
  const cost = Number(after.budget.cost) - Number(before.budget.cost)
  const minutes = transferMinutes(after) - transferMinutes(before)
  return {
    minR,
    perPerson,
    cost,
    transferMinutes: minutes,
    // The plan hash is the plan itself: other places at the same numbers are still a change.
    unchanged: before.plan_hash === after.plan_hash,
  }
}
