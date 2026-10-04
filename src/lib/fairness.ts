import type { Plan, PlanFairness } from '@/api/queries/plans'
import type { Profile } from '@/api/queries/profiles'

/** Fairness slider (E5): 0 favours the total benefit, 3 favours equality. */
export const ALPHA_MIN = 0
export const ALPHA_MAX = 3
/** Step of the fairness slider. */
export const ALPHA_STEP = 0.5
/** The default alpha: balanced (Nash, the weighted log), `fairness_alpha` of a new trip. */
export const ALPHA_DEFAULT = 1

/** A person's weight: the API allows max/min up to 3, so with everyone at least 1 any pick is valid. */
export const WEIGHT_MIN = 1
export const WEIGHT_MAX = 3
export const WEIGHT_STEP = 0.5
/** The weight of a child or of the grandmother's day, like the API's presets (CHILD_WEIGHT, FOCUS_WEIGHT). */
export const WEIGHT_RAISED = 2

/** Whole percent: `r` is a share, the screen says "87%". */
export const PERCENT = 100

/** Offset in `r = (u + 10) / (u* + 10)`, E4 of docs/algorytm.md. */
const R_OFFSET = 10

export type WeightPresetId = 'po_rowno' | 'pod_dzieci' | 'dzien_babci'

/** The preset recorded with a plan (`PlanCreate.weight_preset`, informational for now). */
export const RECORDED_PRESET = {
  po_rowno: 'equal',
  pod_dzieci: 'weighted',
  dzien_babci: 'weighted',
} as const

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
  /** Nothing moved: not the fairness, not the cost, not the time. */
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
    unchanged:
      minR === 0 && cost === 0 && minutes === 0 && [...perPerson.values()].every((d) => d === 0),
  }
}
