import type { Schemas } from '@/api/client'
import type { Rating, Veto } from '@/api/queries/vetoes'
import {
  type CatalogPlace,
  type City,
  catalogPlaces,
  cities,
  familyMembers,
  familyPreferences,
  familyProfiles,
  type Invitation,
  invitation,
  type Member,
  needsApprovalBudget,
  outing,
  type Plan,
  PROFILE_IDS,
  type Preferences,
  type Profile,
  plan,
  type Trip,
  trip,
} from './fixtures'
import { buildPlan, neutralInputs, type PlanInputs } from './plan-builder'

export const scenarioNames = [
  'family-warsaw',
  'many-trips',
  'needs-approval',
  'no-plan',
  'member-readonly',
  'solo',
  'floors-missed',
  'recompute-error',
  'preferences-save-error',
  'server-error',
  'offline',
  'join-valid',
  'join-dead',
  'join-already-member',
  'join-accept-dead',
  'demo-disabled',
  'demo-rate-limited',
  'join-claimable',
  'join-claim-taken',
  'join-named',
  'join-named-taken',
] as const

export type ScenarioName = (typeof scenarioNames)[number]

export const defaultScenario: ScenarioName = 'family-warsaw'

export function isScenarioName(value: unknown): value is ScenarioName {
  return scenarioNames.some((name) => name === value)
}

/** `?scenario=` wins, then the one chosen earlier in this tab, then the default. */
export function pickScenario(search: string, stored: string | null): ScenarioName {
  const fromUrl = new URLSearchParams(search).get('scenario')
  if (isScenarioName(fromUrl)) return fromUrl
  return isScenarioName(stored) ? stored : defaultScenario
}

/** The data one scenario serves. Handlers read and change it, so every start needs a fresh copy. */
export interface World {
  /** How the API behaves: normally, with 500 for everything, or unreachable. */
  behaviour: 'normal' | 'server-error' | 'offline'
  trips: Trip[]
  /** The city catalogue (`GET /places/cities`). */
  cities: City[]
  /** Status the API answers with for one kind of trip write, for a failure no scenario has. */
  failures: { post?: number; patch?: number; delete?: number }
  /** When set, create and PATCH answer 422 with these items (a rule the client cannot see). */
  validationErrors?: Schemas['TripValidationError'][]
  profiles: Profile[]
  /** People with an account and their trip role (the Osoby view joins them with profiles on profile_id). */
  members: Member[]
  /** Preferences of everyone on the main trip (constraints, diet, interests). */
  preferences: Preferences[]
  /** The catalog of the main trip's city (`GET /places`). */
  places: CatalogPlace[]
  /** Every PUT of preferences or of a place rating answers 500, to see the rollback. */
  preferencesSaveFails: boolean
  /** The latest plan of the main trip; null until "Policz plan" creates one. */
  plan: Plan | null
  /** The inputs the current plan was built from; a POST with the same inputs returns it again. */
  planInputs: PlanInputs
  /** Vetoes in force on the main trip, with their authors. */
  vetoes: Veto[]
  /** Ratings of the main trip's places, by every profile. */
  ratings: Rating[]
  /** POST /plans fails with 500 once there is a plan: a veto or a slider saves, the plan stays old. */
  recomputeFails: boolean
  /** Invitations of the main trip, newest first (the host's list). */
  invitations: Invitation[]
  /** Whether POST /auth/demo accepts the invitation token (false: switched off, answers 404). */
  demoEnabled: boolean
  /** POST /auth/demo answers 429: too many attempts from this address. */
  demoRateLimited: boolean
  /** What a person opening an invitation link meets (/invitations/preview and /accept). */
  join: {
    /** "ok": a working token. "dead": expired, revoked or full, which the API answers with 404. */
    preview: 'ok' | 'dead'
    /** The caller is on the trip already, so accepting is idempotent. */
    alreadyMember: boolean
    accept: 'ok' | 'dead'
    /** Profiles without an account that the preview offers (`claimable_profiles`). */
    claimable: string[]
    /** Profiles somebody else takes first: accepting one answers 409 and drops it from the list. */
    taken: string[]
    /** A named invitation: accepting any other profile answers 409. */
    namedFor: string | null
  }
}

/** 45 trips for the paginated list: every third is an outing, roles and dates rotate. */
function manyTrips(count: number): Trip[] {
  const roles = ['host', 'co_host', 'member'] as const
  const names = ['Gdańsk', 'Kraków', 'Wrocław', 'Poznań', 'Toruń']
  return Array.from({ length: count }, (_, index) => {
    const day = String((index % 28) + 1).padStart(2, '0')
    const outing = index % 3 === 2
    return trip({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      name: `${names[index % names.length]} ${index + 1}`,
      destination: names[index % names.length] ?? null,
      city_slug: index % 2 === 0 ? 'warszawa' : null,
      created_at: `2026-09-${day}T10:00:00Z`,
      start_date: `2026-11-${day}`,
      end_date: `2026-11-${day}`,
      kind: outing ? 'outing' : 'trip',
      my_role: roles[index % roles.length] ?? 'host',
    })
  })
}

export function createWorld(name: ScenarioName): World {
  const main = trip()
  const base: World = {
    behaviour: 'normal',
    trips: [main, outing()],
    cities: cities(),
    failures: {},
    profiles: familyProfiles(),
    members: familyMembers(),
    preferences: familyPreferences(),
    places: catalogPlaces(),
    preferencesSaveFails: false,
    plan: plan(main.id),
    planInputs: neutralInputs(familyProfiles(), main.fairness_alpha),
    vetoes: [],
    ratings: [],
    recomputeFails: false,
    invitations: [invitation()],
    demoEnabled: true,
    demoRateLimited: false,
    join: {
      preview: 'ok',
      alreadyMember: false,
      accept: 'ok',
      claimable: [],
      taken: [],
      namedFor: null,
    },
  }
  switch (name) {
    case 'family-warsaw':
      return base
    case 'many-trips':
      return { ...base, trips: manyTrips(45) }
    case 'needs-approval':
      return { ...base, plan: plan(main.id, { budget: needsApprovalBudget() }) }
    case 'no-plan':
      return { ...base, plan: null }
    case 'member-readonly':
      return {
        ...base,
        trips: [trip({ my_role: 'member' }), outing({ my_role: 'member' })],
        members: familyMembers('member'),
      }
    case 'solo': {
      const alone = familyProfiles().slice(0, 1)
      return {
        ...base,
        profiles: alone,
        members: familyMembers().slice(0, 1),
        planInputs: neutralInputs(alone, main.fairness_alpha),
        plan: buildPlan(main.id, alone, neutralInputs(alone, main.fairness_alpha), 1),
      }
    }
    case 'floors-missed':
      return {
        ...base,
        plan: plan(main.id, {
          floors_missed: [
            { kind: 'floor', profile_id: PROFILE_IDS.babcia, shortfall: 6 },
            { kind: 'own_place_day', profile_id: PROFILE_IDS.antek, shortfall: 1, day: 2 },
          ],
          violation: 0.35,
          conflicts: [
            { reason_code: 'floor_unreachable', profile_ids: [PROFILE_IDS.babcia] },
            { reason_code: 'unknown_price', profile_ids: [] },
          ],
        }),
      }
    case 'recompute-error':
      return { ...base, recomputeFails: true }
    case 'preferences-save-error':
      return { ...base, preferencesSaveFails: true }
    case 'server-error':
      return { ...base, behaviour: 'server-error' }
    case 'offline':
      return { ...base, behaviour: 'offline' }
    case 'join-valid':
      return base
    case 'join-dead':
      return { ...base, join: { ...base.join, preview: 'dead' } }
    case 'join-already-member':
      return { ...base, join: { ...base.join, alreadyMember: true } }
    case 'join-accept-dead':
      return { ...base, join: { ...base.join, accept: 'dead' } }
    case 'demo-disabled':
      return { ...base, demoEnabled: false }
    case 'demo-rate-limited':
      return { ...base, demoRateLimited: true }
    case 'join-claimable':
      return { ...base, join: { ...base.join, claimable: [PROFILE_IDS.zosia, PROFILE_IDS.antek] } }
    case 'join-claim-taken':
      return {
        ...base,
        join: {
          ...base.join,
          claimable: [PROFILE_IDS.zosia, PROFILE_IDS.antek],
          taken: [PROFILE_IDS.zosia],
        },
      }
    case 'join-named-taken':
      return {
        ...base,
        join: {
          ...base.join,
          claimable: [PROFILE_IDS.zosia],
          taken: [PROFILE_IDS.zosia],
          namedFor: PROFILE_IDS.zosia,
        },
      }
    case 'join-named':
      return {
        ...base,
        join: {
          ...base.join,
          claimable: [PROFILE_IDS.zosia],
          namedFor: PROFILE_IDS.zosia,
        },
      }
  }
}
