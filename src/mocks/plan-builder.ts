import type { Profile } from './fixtures'
import { days, FAMILY_FAIRNESS, groupFairness, type Plan, person, plan } from './fixtures'

/** Everything the mock "solver" reads, so the same inputs give the same plan version. */
export interface PlanInputs {
  alpha: number
  /** Weight per profile id. */
  weights: Record<string, number>
  /** Ids of the places with an active veto. */
  vetoed: string[]
}

/** The inputs of a plan nobody has touched: the weights the profiles carry, no vetoes. */
export const neutralInputs = (profiles: Profile[], alpha: number): PlanInputs => ({
  alpha,
  weights: Object.fromEntries(profiles.map((profile) => [profile.id, profile.weight])),
  vetoed: [],
})

export const planInputKey = (inputs: PlanInputs): string => JSON.stringify(inputs)

/** What one weight point moves a person's welfare in the mock. */
const WEIGHT_EFFECT = 6
/** From this alpha on, the mock pulls everyone toward the average (more equality). */
const EQUALITY_ALPHA = 2
const EQUALITY_PULL = 0.3
const COST_PER_VETO = 90
const BASE_COST = 1480
const HASH_LENGTH = 12
const HEX = 16

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

function hash12(text: string): string {
  let h = 0
  for (const char of text) h = (Math.imul(h, 31) + char.charCodeAt(0)) >>> 0
  return h.toString(HEX).padStart(8, '0').repeat(2).slice(0, HASH_LENGTH)
}

/**
 * A stand-in for the backend solver (backend#50): not an algorithm, but moves the numbers the way
 * the specification says. A heavier weight raises that person and lowers the others, a veto takes
 * the place out of the plan, and a high alpha pulls everyone toward the average. The real numbers
 * come from the API.
 */
/** The plan hash follows the content (places and welfare), like the API's: same plan, same hash. */
const contentHash = (placeIds: string[], welfare: number[]) =>
  hash12(JSON.stringify({ placeIds, welfare }))

/** The hash of the untouched family plan is the one of the fixture. */
const FAMILY_HASH = contentHash(
  days().flatMap((day) => day.items.map((stop) => stop.place_id)),
  Object.values(FAMILY_FAIRNESS).map((p) => p.u),
)

export function buildPlan(
  tripId: string,
  profiles: Profile[],
  inputs: PlanInputs,
  version: number,
): Plan {
  const known = (id: string) =>
    FAMILY_FAIRNESS[id] ?? {
      name: '',
      u: 70,
      uStar: 80,
      scores: [70, 70, 70, 70, 70],
      weakest: 'cost' as const,
    }
  const meanWeight =
    profiles.reduce((sum, profile) => sum + (inputs.weights[profile.id] ?? 1), 0) /
    Math.max(1, profiles.length)
  const meanU =
    profiles.reduce((sum, profile) => sum + known(profile.id).u, 0) / Math.max(1, profiles.length)
  const people = profiles.map((profile) => {
    const base = known(profile.id)
    const moved = base.u + WEIGHT_EFFECT * ((inputs.weights[profile.id] ?? 1) - meanWeight)
    const u = clamp(
      inputs.alpha >= EQUALITY_ALPHA ? moved + (meanU - moved) * EQUALITY_PULL : moved,
    )
    return person(profile.id, profile.display_name, u, base.uStar, base.scores, base.weakest)
  })
  const kept = days().map((day) => ({
    ...day,
    items: day.items
      .filter((stop) => !inputs.vetoed.includes(stop.place_id))
      .map((stop) => ({
        ...stop,
        price_lines: stop.price_lines?.filter((line) =>
          profiles.some((profile) => profile.id === line.profile_id),
        ),
      })),
  }))
  const key = planInputKey(inputs)
  const planHash = contentHash(
    kept.flatMap((day) => day.items.map((stop) => stop.place_id)),
    people.map((p) => p.u),
  )
  return plan(tripId, {
    id: `5d1c0e77-8a2b-4c3d-9e4f-${version.toString(HEX).padStart(12, '0')}`,
    version,
    input_hash: hash12(key).repeat(6).slice(0, 64),
    plan_hash: planHash === FAMILY_HASH ? plan(tripId).plan_hash : planHash,
    params: { alpha: inputs.alpha, weight_preset: 'default' },
    days: kept,
    fairness: groupFairness(people),
    budget: {
      ...plan(tripId).budget,
      cost: (BASE_COST - COST_PER_VETO * inputs.vetoed.length).toFixed(2),
    },
  })
}
