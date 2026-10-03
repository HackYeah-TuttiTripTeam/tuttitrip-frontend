import type { Schemas } from '@/api/client'
import {
  type City,
  cities,
  familyMembers,
  familyProfiles,
  type Invitation,
  invitation,
  type Member,
  needsApprovalBudget,
  outing,
  type Plan,
  type Profile,
  plan,
  type Trip,
  trip,
} from './fixtures'

export const scenarioNames = [
  'family-warsaw',
  'needs-approval',
  'no-plan',
  'member-readonly',
  'server-error',
  'offline',
  'join-valid',
  'join-dead',
  'join-already-member',
  'join-accept-dead',
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
  /** The latest plan of the main trip; null until "Policz plan" creates one. */
  plan: Plan | null
  /** Invitations of the main trip, newest first (the host's list). */
  invitations: Invitation[]
  /** What a person opening an invitation link meets (/invitations/preview and /accept). */
  join: {
    /** "ok": a working token. "dead": expired, revoked or full, which the API answers with 404. */
    preview: 'ok' | 'dead'
    /** The caller is on the trip already, so accepting is idempotent. */
    alreadyMember: boolean
    accept: 'ok' | 'dead'
  }
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
    plan: plan(main.id),
    invitations: [invitation()],
    join: { preview: 'ok', alreadyMember: false, accept: 'ok' },
  }
  switch (name) {
    case 'family-warsaw':
      return base
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
  }
}
