import type { Schemas } from '@/api/client'
import {
  type CatalogPlace,
  type City,
  catalogPlaces,
  cities,
  type Expense,
  expense,
  familyExpenses,
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

export const scenarioNames = [
  'family-warsaw',
  'many-trips',
  'needs-approval',
  'no-plan',
  'member-readonly',
  'no-expenses',
  'many-expenses',
  'settlement-closed',
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
  /** Expenses of the main trip (`/trips/{id}/expenses`); the settlement is computed from them. */
  expenses: Expense[]
  /** The host has closed the settlement: expense writes answer 409 and `closed_at` is set. */
  settlementClosed: boolean
  /** The latest plan of the main trip; null until "Policz plan" creates one. */
  plan: Plan | null
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

/** 45 expenses for the paginated list: payers rotate, one day apart, amounts differ. */
function manyExpenses(count: number): Expense[] {
  const payers = [PROFILE_IDS.mama, PROFILE_IDS.tata, PROFILE_IDS.babcia] as const
  const categories = ['food', 'transport', 'lodging', 'activities', 'shopping', 'other'] as const
  return Array.from({ length: count }, (_, index) =>
    expense({
      id: `5a1c0e11-8b2d-4c3e-9f40-${String(index + 100).padStart(12, '0')}`,
      description: `Wydatek ${index + 1}`,
      amount: `${10 + index}.00`,
      spent_on: `2026-10-${String((index % 28) + 1).padStart(2, '0')}`,
      created_at: `2026-10-01T10:${String(index).padStart(2, '0')}:00Z`,
      category: categories[index % categories.length] ?? null,
      payer_profile_id: payers[index % payers.length] ?? PROFILE_IDS.mama,
    }),
  )
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
    expenses: familyExpenses(),
    settlementClosed: false,
    plan: plan(main.id),
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
    case 'no-expenses':
      return { ...base, expenses: [] }
    case 'settlement-closed':
      return { ...base, settlementClosed: true }
    case 'many-expenses':
      return { ...base, expenses: manyExpenses(45) }
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
