import {
  familyMembers,
  familyProfiles,
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
  profiles: Profile[]
  /** People with an account and their trip role (the Osoby view joins them with profiles on profile_id). */
  members: Member[]
  /** The latest plan of the main trip; null until "Policz plan" creates one. */
  plan: Plan | null
}

export function createWorld(name: ScenarioName): World {
  const main = trip()
  const base: World = {
    behaviour: 'normal',
    trips: [main, outing()],
    profiles: familyProfiles(),
    members: familyMembers(),
    plan: plan(main.id),
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
  }
}
