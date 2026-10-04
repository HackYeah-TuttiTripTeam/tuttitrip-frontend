import type { Schemas } from '@/api/client'
import type { Rating, Veto } from '@/api/queries/vetoes'
import type { VotePlace } from '@/api/vote-contract'
import type { CitySearchMode } from './city-search'
import {
  type AdminUser,
  adminUsers,
  type CatalogPlace,
  type Checkin,
  type City,
  catalogPlaces,
  cities,
  type Expense,
  expense,
  familyCheckins,
  familyExpenses,
  familyMembers,
  familyPreferences,
  familyProfiles,
  galleryPhotos,
  type Invitation,
  invitation,
  location,
  type Me,
  type Member,
  type MemberLocation,
  MOCK_USER_NAME,
  me,
  type Notification,
  needsApprovalBudget,
  notifications,
  outing,
  type Photo,
  type PlaceVoteSummary,
  type Plan,
  PROFILE_IDS,
  type Preferences,
  type Profile,
  plan,
  type Trip,
  trip,
  type VoteLink,
  voteLink,
  votePlaces,
  voteSummary,
} from './fixtures'
import { emptyInterviewWorld, emptyTrip, type InterviewWorld, resumedMessages } from './interview'
import { adminMe, createPermissionsWorld, type PermissionsWorld } from './permissions'
import { buildPlan, neutralInputs, type PlanInputs } from './plan-builder'
import { answer, type ProposalState, sentProposal, staleProposal } from './proposals'

export const scenarioNames = [
  'family-warsaw',
  'many-trips',
  'needs-approval',
  'no-plan',
  'others-share-location',
  'member-readonly',
  'solo',
  'floors-missed',
  'recompute-error',
  'no-expenses',
  'many-expenses',
  'settlement-closed',
  'member-pending',
  'cohost',
  'users-admin',
  'users-admin-read-only',
  'google-account',
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
  'notifications-inbox',
  'notifications-empty',
  'notifications-error',
  'notifications-live',
  'notifications-stream-down',
  'admin',
  'admin-readonly',
  'vote-with-link',
  'vote-dead',
  'vote-write-error',
  'interview-empty',
  'interview-resumed',
  'interview-resumed-partial',
  'interview-city-only',
  'proposal-none',
  'proposal-sent',
  'proposal-approved',
  'proposal-outdated',
  'proposal-many-answers',
  'proposal-member',
  'proposal-draft',
  'city-search-geocoder-down',
  'city-search-error',
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
  /** `GET /me`: who the caller is and what the API lets them do. */
  me: Me
  /** The roles, users and audit behind `/admin/permissions`. */
  permissions: PermissionsWorld
  trips: Trip[]
  /** The city catalogue (`GET /places/cities`). */
  cities: City[]
  /** How the live city search (`GET /places/cities/search`) behaves. */
  citySearch: CitySearchMode
  /** Status the API answers with for one kind of trip write, for a failure no scenario has. */
  failures: { post?: number; patch?: number; delete?: number }
  /** When set, create and PATCH answer 422 with these items (a rule the client cannot see). */
  validationErrors?: Schemas['TripValidationError'][]
  profiles: Profile[]
  /** People with an account and their trip role (the Osoby view joins them with profiles on profile_id). */
  members: Member[]
  /** The accounts of the admin panel (`GET /admin/users`). */
  adminUsers: AdminUser[]
  /** The caller's display name, changed by `PATCH /me/account`. */
  accountName: string
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
  /** The inputs the current plan was built from; a POST with the same inputs returns it again. */
  planInputs: PlanInputs
  /** Vetoes in force on the main trip, with their authors. */
  vetoes: Veto[]
  /** Ratings of the main trip's places, by every profile. */
  ratings: Rating[]
  /** POST /plans fails with 500 once there is a plan: a veto or a slider saves, the plan stays old. */
  recomputeFails: boolean
  /** Check-ins (where everyone stays) of the main trip. */
  checkins: Checkin[]
  /** Photos of the main trip, in upload order (the handler sorts them). */
  photos: Photo[]
  /** Positions members share right now. */
  locations: MemberLocation[]
  /** Status the photo upload answers with, for a refusal (413, 422) no scenario has. */
  photoUploadStatus?: number
  /** The caller's own location-sharing consent. */
  consent: { enabled: boolean; until: string | null }
  /** Invitations of the main trip, newest first (the host's list). */
  invitations: Invitation[]
  /** The signed-in user's notifications, newest first; marking changes them in place. */
  notifications: Notification[]
  /** The live stream: `quiet` opens and stays silent, `live` adds a notification every few seconds, `down` answers 503. */
  notificationStream: 'quiet' | 'live' | 'down'
  /** How often the `live` stream adds a notification. */
  notificationLiveEveryMs: number
  /** Every /notifications call answers 500 (the rest of the API works). */
  notificationsFail: boolean
  /** Voting links of the main trip, newest first (the host's panel; never holds a token). */
  voteLinks: VoteLink[]
  /** The group's answers per place (`GET /vote-summary`). */
  voteSummary: PlaceVoteSummary[]
  /** The voting page of a person without an account (`/vote/*`, the contract of backend#81). */
  vote: {
    /** "dead": expired or revoked, which the API answers with 401. */
    link: 'ok' | 'dead'
    profileName: string
    places: VotePlace[]
    /** Every write answers 500. */
    writeFails: boolean
  }
  /** The proposal last sent for the main trip; null until the host sends one. */
  proposal: ProposalState | null
  /** The interview of the main trip: session, scripted assistant, knowledge sources. */
  interview: InterviewWorld
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
    me: me(),
    permissions: createPermissionsWorld(),
    trips: [main, outing()],
    cities: cities(),
    citySearch: 'ok',
    failures: {},
    profiles: familyProfiles(),
    members: familyMembers(),
    adminUsers: adminUsers(),
    accountName: MOCK_USER_NAME,
    preferences: familyPreferences(),
    places: catalogPlaces(),
    preferencesSaveFails: false,
    expenses: familyExpenses(),
    settlementClosed: false,
    plan: plan(main.id),
    planInputs: neutralInputs(familyProfiles(), main.fairness_alpha),
    vetoes: [],
    ratings: [],
    recomputeFails: false,
    checkins: familyCheckins(),
    photos: galleryPhotos(),
    locations: [],
    consent: { enabled: false, until: null },
    invitations: [invitation()],
    notifications: notifications(6, 3),
    notificationsFail: false,
    notificationStream: 'quiet',
    notificationLiveEveryMs: 4_000,
    voteLinks: [],
    voteSummary: voteSummary(),
    vote: { link: 'ok', profileName: 'Zosia', places: votePlaces(), writeFails: false },
    proposal: null,
    interview: emptyInterviewWorld(),
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
    case 'others-share-location':
      return {
        ...base,
        locations: [
          location(PROFILE_IDS.tata, { display_name: 'Marek' }),
          location(PROFILE_IDS.babcia, {
            display_name: 'Babcia Halina',
            latitude: 52.2319,
            longitude: 21.0067,
            recorded_at: new Date(Date.now() - 6 * 60_000).toISOString(),
          }),
        ],
      }
    case 'city-search-geocoder-down':
      return { ...base, citySearch: 'geocoder-down' }
    case 'city-search-error':
      return { ...base, citySearch: 'error' }
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
    case 'no-expenses':
      return { ...base, expenses: [] }
    case 'settlement-closed':
      return { ...base, settlementClosed: true }
    case 'many-expenses':
      return { ...base, expenses: manyExpenses(45) }
    case 'member-pending': {
      const members = familyMembers('member')
      for (const member of members) if (member.is_me) member.status = 'pending'
      return {
        ...base,
        trips: [trip({ my_role: 'member', my_status: 'pending' }), outing({ my_role: 'member' })],
        members,
      }
    }
    case 'cohost':
      return {
        ...base,
        trips: [trip({ my_role: 'co_host' }), outing({ my_role: 'co_host' })],
        members: familyMembers('co_host'),
      }
    case 'users-admin':
      return { ...base, me: me({ is_admin: true, roles: ['admin'] }) }
    case 'users-admin-read-only':
      return { ...base, me: me({ access: { 'admin.users': 'READ' } }) }
    case 'google-account':
      return { ...base, me: me({ sub: 'google-oauth2|mock-user' }) }
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
    case 'vote-with-link':
      return { ...base, voteLinks: [voteLink({ last_used_at: '2026-10-02T12:00:00Z' })] }
    case 'vote-dead':
      return { ...base, vote: { ...base.vote, link: 'dead' } }
    case 'vote-write-error':
      return { ...base, vote: { ...base.vote, writeFails: true } }
    case 'interview-empty': {
      const fresh = emptyTrip()
      return {
        ...base,
        trips: [fresh, outing()],
        profiles: familyProfiles().slice(0, 1),
        preferences: [],
      }
    }
    case 'interview-resumed': {
      const messages = resumedMessages(40)
      return { ...base, interview: { ...emptyInterviewWorld(), started: true, messages } }
    }
    case 'interview-resumed-partial': {
      // Back to a talk where the city, the dates and two people are settled and the budget is not.
      const partial = trip({
        budget_total_min: null,
        budget_total_max: null,
        budget_day_min: null,
        budget_day_max: null,
      })
      const messages = resumedMessages(6)
      return {
        ...base,
        trips: [partial, outing()],
        profiles: familyProfiles().slice(0, 3),
        interview: { ...emptyInterviewWorld(), started: true, messages },
      }
    }
    case 'interview-city-only': {
      // Only the city is known: "Build plan now" works and lists what it had to assume.
      const cityOnly = emptyTrip()
      cityOnly.city_slug = 'warszawa'
      cityOnly.destination = 'Warszawa'
      return {
        ...base,
        trips: [cityOnly, outing()],
        profiles: familyProfiles().slice(0, 1),
        preferences: [],
        plan: null,
      }
    }
    case 'proposal-none':
      return base
    case 'proposal-sent':
      return { ...base, proposal: sentProposal(base, [answer('Marek', 'approve', '10:00')]) }
    case 'proposal-approved':
      return {
        ...base,
        proposal: sentProposal(base, [
          answer('Marek', 'approve', '10:00'),
          answer('Babcia Halina', 'approve', '10:30'),
          answer('Ola', 'approve', '11:00', null, true),
        ]),
      }
    case 'proposal-outdated':
      return { ...base, proposal: staleProposal(base) }
    case 'proposal-many-answers':
      return {
        ...base,
        proposal: sentProposal(
          base,
          Array.from({ length: 25 }, (_, index) =>
            answer(
              `Osoba ${String(index + 1).padStart(2, '0')}`,
              index % 5 === 0 ? 'reject' : index % 3 === 0 ? 'comment' : 'approve',
              `${String(8 + (index % 12)).padStart(2, '0')}:00`,
              index % 3 === 0 ? `Uwaga numer ${index + 1}` : null,
            ),
          ),
        ),
      }
    case 'proposal-member': {
      const member = {
        ...base,
        trips: [trip({ my_role: 'member' }), outing({ my_role: 'member' })],
        members: familyMembers('member'),
      }
      return {
        ...member,
        proposal: sentProposal(member, [answer('Marek', 'reject', '10:00', 'Za dużo chodzenia')]),
      }
    }
    case 'proposal-draft':
      return {
        ...base,
        plan: plan(main.id, { params: { alpha: 1, weight_preset: 'default', draft: true } }),
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
    case 'notifications-inbox':
      return { ...base, notifications: notifications(134, 40) }
    case 'notifications-empty':
      return { ...base, notifications: [] }
    case 'notifications-error':
      return { ...base, notificationsFail: true }
    case 'notifications-live':
      return { ...base, notificationStream: 'live' }
    case 'notifications-stream-down':
      return { ...base, notificationStream: 'down' }
    case 'admin':
      return { ...base, me: adminMe('WRITE', base.me) }
    case 'admin-readonly':
      return { ...base, me: adminMe('READ', base.me) }
  }
}
