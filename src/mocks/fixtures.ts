// Test data typed from the generated API contract (src/api/schema.d.ts). No hand-written shapes:
// after `pnpm api:sync` a contract change breaks `tsc` here instead of silently drifting.
// Amounts are decimal strings, like in the API.
import type { Schemas } from '@/api/client'
import type { VotePlace } from '@/api/vote-contract'

export type Trip = Schemas['TripRead']
export type Profile = Schemas['ProfileRead']
export type Plan = Schemas['PlanRead']
export type PlanStop = Schemas['PlanStop']
export type PlanDay = Schemas['PlanDay']
export type PlanBudget = Schemas['PlanBudget']
export type PersonFairness = Schemas['PersonFairness']
export type PlanDomainCode = Schemas['PlanDomainCode']
export type Me = Schemas['MeResponse']
export type Member = Schemas['MemberRead']
export type AdminUser = Schemas['AdminUserRead']
export type Invitation = Schemas['InvitationRead']
export type VoteLink = Schemas['VoteLinkRead']
export type PlaceVoteSummary = Schemas['PlaceVoteSummary']
export type City = Schemas['CityRead']
export type Preferences = Schemas['PreferencesRead']
export type CatalogPlace = Schemas['PlaceRead']

/** The signed-in test user, the host of most scenarios. */
export const MOCK_USER_SUB = 'auth0|mock-user'
export const MOCK_USER_NAME = 'Ola Testowa'

/** The invitation token the mock API accepts at POST /auth/demo (scenario "demo-disabled" refuses it). */
export const MOCK_DEMO_TOKEN = 'mock-demo-token'

export const TRIP_ID = '3f0c2a52-6d0b-4a39-8f0e-7a7c9a1c0b11'
export const OUTING_ID = '9a6d1f34-2b7e-4c58-b1d3-5e8f0a7c4d22'

export const PROFILE_IDS = {
  mama: '0b1f5c1a-7d3e-4e0a-9c11-1a2b3c4d5e01',
  tata: '0b1f5c1a-7d3e-4e0a-9c11-1a2b3c4d5e02',
  babcia: '0b1f5c1a-7d3e-4e0a-9c11-1a2b3c4d5e03',
  zosia: '0b1f5c1a-7d3e-4e0a-9c11-1a2b3c4d5e04',
  antek: '0b1f5c1a-7d3e-4e0a-9c11-1a2b3c4d5e05',
} as const

const PLACE_IDS = {
  zamek: '7c2e9a10-4d5b-4f61-8a3c-0000000000a1',
  prasowy: '7c2e9a10-4d5b-4f61-8a3c-0000000000a2',
  lazienki: '7c2e9a10-4d5b-4f61-8a3c-0000000000a3',
  kopernik: '7c2e9a10-4d5b-4f61-8a3c-0000000000a4',
  skaryszewski: '7c2e9a10-4d5b-4f61-8a3c-0000000000a5',
  pyzy: '7c2e9a10-4d5b-4f61-8a3c-0000000000a6',
} as const

export const trip = (overrides: Partial<Trip> = {}): Trip => ({
  id: TRIP_ID,
  name: 'Warszawa z rodziną',
  destination: 'Warszawa',
  created_at: '2026-10-01T10:00:00Z',
  start_date: '2026-10-10',
  end_date: '2026-10-11',
  day_start: '09:00:00',
  day_end: '20:00:00',
  city_slug: 'warszawa',
  currency: 'PLN',
  budget_total_min: '1200.00',
  budget_total_max: '1600.00',
  budget_day_min: null,
  budget_day_max: null,
  budget_flex_pct: 10,
  fairness_alpha: 1,
  my_role: 'host',
  my_status: 'confirmed',
  kind: 'trip',
  ...overrides,
})

export const outing = (overrides: Partial<Trip> = {}): Trip =>
  trip({
    id: OUTING_ID,
    name: 'Niedzielny spacer po Łazienkach',
    destination: 'Warszawa',
    created_at: '2026-09-20T08:30:00Z',
    start_date: '2026-10-18',
    end_date: '2026-10-18',
    budget_total_min: null,
    budget_total_max: null,
    kind: 'outing',
    ...overrides,
  })

/** Comfort defaults of an adult, like the API's defaults for that age group. */
const ADULT_COMFORT = {
  segment_km: 3,
  daily_km: 12,
  active_min: 600,
  stairs_sensitivity: 0.2,
  queue_patience_min: 40,
  nap_start: null,
  nap_minutes: 0,
  floor: 30,
}

/**
 * A person. Comfort values start from the adult defaults; pass the values that differ and list
 * their names in `customized_fields` (the API computes that list against the age group).
 */
export const profile = (
  id: string,
  displayName: string,
  age: number,
  ageGroup: Profile['age_group'],
  overrides: Partial<Profile> = {},
): Profile => ({
  ...ADULT_COMFORT,
  id,
  trip_id: TRIP_ID,
  display_name: displayName,
  age,
  age_group: ageGroup,
  user_sub: null,
  weight: 1,
  customized_fields: [],
  ...overrides,
})

/** Accounts of the people who have one; the others (children, sometimes the grandmother) have none. */
export const SUBS = {
  mama: MOCK_USER_SUB,
  tata: 'auth0|mock-marek',
  babcia: 'auth0|mock-halina',
} as const

/**
 * Mother, father, grandmother and two children. The grandmother's walking limits were changed by
 * the host, so her `customized_fields` is not empty; everyone else keeps the age defaults.
 */
export const familyProfiles = (): Profile[] => [
  profile(PROFILE_IDS.mama, 'Ola', 38, 'adult', { user_sub: SUBS.mama }),
  profile(PROFILE_IDS.tata, 'Marek', 40, 'adult', { user_sub: SUBS.tata }),
  profile(PROFILE_IDS.babcia, 'Babcia Halina', 72, 'senior', {
    user_sub: SUBS.babcia,
    weight: 1.5,
    segment_km: 0.8,
    daily_km: 4,
    active_min: 420,
    stairs_sensitivity: 0.7,
    queue_patience_min: 20,
    nap_start: '14:00:00',
    nap_minutes: 30,
    customized_fields: ['segment_km', 'daily_km'],
  }),
  profile(PROFILE_IDS.zosia, 'Zosia', 9, 'child', {
    segment_km: 1,
    daily_km: 4,
    active_min: 300,
    stairs_sensitivity: 0.6,
    queue_patience_min: 15,
    nap_start: '13:00:00',
    nap_minutes: 60,
  }),
  profile(PROFILE_IDS.antek, 'Antek', 3, 'toddler', {
    segment_km: 0.5,
    daily_km: 2,
    active_min: 240,
    stairs_sensitivity: 0.8,
    queue_patience_min: 10,
    nap_start: '13:00:00',
    nap_minutes: 90,
  }),
]

/**
 * Members (people with an account) of the family, with trip roles. The caller (Ola) has `myRole`;
 * Marek is the host unless Ola is, then he is a co-host. The grandmother is a plain member.
 */
export const familyMembers = (myRole: Trip['my_role'] = 'host'): Member[] => [
  {
    profile_id: PROFILE_IDS.mama,
    display_name: 'Ola',
    role: myRole,
    status: 'confirmed',
    is_me: true,
  },
  {
    profile_id: PROFILE_IDS.tata,
    display_name: 'Marek',
    role: myRole === 'host' ? 'co_host' : 'host',
    status: 'confirmed',
    is_me: false,
  },
  {
    profile_id: PROFILE_IDS.babcia,
    display_name: 'Babcia Halina',
    role: 'member',
    status: 'pending',
    is_me: false,
  },
]

/** What the API answers for a person nobody has filled in yet: the age defaults, nothing ticked. */
export const preferences = (
  profileId: string,
  overrides: Partial<Preferences> = {},
): Preferences => ({
  profile_id: profileId,
  interests: {},
  diet: { tags: [], allergies: [] },
  example_places: [],
  min_tags: [],
  importance_pool: { lodging: 2, food: 2, attractions: 2, pace: 2, cost: 2 },
  constraints: {
    wheelchair: false,
    stairs: false,
    heat: false,
    cold: false,
    audio_description: false,
    disability_note: null,
  },
  effective_stairs_sensitivity: null,
  filled: false,
  updated_by_sub: null,
  updated_at: null,
  ...overrides,
})

/**
 * Who filled in what: Ola and the grandmother did, Marek is vegetarian, the children are still
 * on the age defaults. The grandmother avoids stairs.
 */
export const familyPreferences = (): Preferences[] => [
  preferences(PROFILE_IDS.mama, {
    filled: true,
    interests: { history: 1, museums: 1, local_food: 1 },
    min_tags: [
      { domain: 'food', tag: 'polish' },
      { domain: 'attractions', tag: 'museums' },
    ],
    updated_at: '2026-10-02T09:00:00Z',
  }),
  preferences(PROFILE_IDS.tata, {
    filled: true,
    interests: { sport: 1, cycling: 1 },
    diet: { tags: ['vegetarian'], allergies: [] },
    updated_at: '2026-10-02T09:30:00Z',
  }),
  preferences(PROFILE_IDS.babcia, {
    filled: true,
    interests: { parks: 1, music: 1 },
    diet: { tags: ['lactose_free'], allergies: ['orzechy'] },
    constraints: {
      wheelchair: false,
      stairs: true,
      heat: true,
      cold: false,
      audio_description: false,
      disability_note: 'Słabszy słuch, lepiej w spokojnych miejscach.',
    },
    updated_at: '2026-10-02T10:00:00Z',
  }),
  preferences(PROFILE_IDS.zosia),
  preferences(PROFILE_IDS.antek),
]

const DOMAINS: PlanDomainCode[] = ['attractions', 'food', 'pace', 'cost', 'lodging']

const person = (
  profileId: string,
  name: string,
  u: number,
  uStar: number,
  scores: number[],
  weakest: PlanDomainCode,
): PersonFairness => ({
  profile_id: profileId,
  name,
  u,
  u_star: uStar,
  r: Math.min(1, (u + 10) / (uStar + 10)),
  floor: 40,
  floor_eff: 40,
  floor_met: u >= 40,
  domains: DOMAINS.map((domain, index) => ({
    domain,
    q: scores[index] ?? 0,
    not_applicable: false,
  })),
  own_place_days: 1,
  weakest_domain: weakest,
})

/** A stop with every price and hours field filled and verified. */
const verifiedStop = (overrides: Partial<PlanStop> & Pick<PlanStop, 'place_id' | 'name'>) =>
  ({
    kind: 'attraction',
    lat: 52.2477,
    lon: 21.0148,
    start: '10:00:00',
    end: '12:00:00',
    transfer: null,
    cost_per_person: '30.00',
    price_base: '30.00',
    price_inflated: '30.00',
    price_verified: true,
    price_source_url: 'https://example.com/cennik',
    price_verified_at: '2026-09-28T09:00:00Z',
    hours_verified: true,
    hours_source_url: 'https://example.com/godziny',
    hours_verified_at: '2026-09-28T09:00:00Z',
    google_place_id: null,
    ...overrides,
  }) satisfies PlanStop

const days = (): PlanDay[] => [
  {
    index: 1,
    date: '2026-10-10',
    items: [
      verifiedStop({
        place_id: PLACE_IDS.zamek,
        name: 'Zamek Królewski',
        address: 'Plac Zamkowy 4, 00-277 Warszawa',
        start: '10:00:00',
        end: '12:00:00',
      }),
      // Price not verified: the plan inflated the base price by delta (E6).
      verifiedStop({
        place_id: PLACE_IDS.prasowy,
        name: 'Bar Mleczny Prasowy',
        kind: 'food',
        start: '12:30:00',
        end: '13:30:00',
        transfer: { minutes: 12, mode: 'walk', cost: '0.00' },
        cost_per_person: '28.75',
        price_base: '25.00',
        price_inflated: '28.75',
        price_verified: false,
        price_source_url: 'https://example.com/bar-cennik',
        price_verified_at: null,
      }),
      verifiedStop({
        place_id: PLACE_IDS.lazienki,
        name: 'Łazienki Królewskie',
        start: '15:00:00',
        end: '17:30:00',
        transfer: { minutes: 25, mode: 'transit', cost: '4.40' },
        cost_per_person: '0.00',
        price_base: '0.00',
        price_inflated: '0.00',
      }),
    ],
  },
  {
    index: 2,
    date: '2026-10-11',
    items: [
      verifiedStop({
        place_id: PLACE_IDS.kopernik,
        name: 'Centrum Nauki Kopernik',
        start: '10:00:00',
        end: '13:00:00',
        cost_per_person: '35.00',
        price_base: '35.00',
        price_inflated: '35.00',
      }),
      // No source for the opening hours, and the price of the meal is unknown.
      verifiedStop({
        place_id: PLACE_IDS.pyzy,
        name: 'Pyzy Flaki Gorące',
        kind: 'food',
        start: '13:30:00',
        end: '14:30:00',
        transfer: { minutes: 18, mode: 'transit', cost: null },
        cost_per_person: null,
        price_base: null,
        price_inflated: null,
        price_verified: false,
        price_source_url: null,
        price_verified_at: null,
        hours_verified: false,
        hours_source_url: null,
        hours_verified_at: null,
      }),
      verifiedStop({
        place_id: PLACE_IDS.skaryszewski,
        name: 'Park Skaryszewski',
        start: '15:30:00',
        end: '17:00:00',
        transfer: { minutes: 20, mode: 'walk', cost: '0.00' },
        cost_per_person: '0.00',
        price_base: '0.00',
        price_inflated: '0.00',
        hours_verified: false,
        hours_source_url: null,
        hours_verified_at: null,
      }),
    ],
  },
]

const withinBudget = (): PlanBudget => ({
  currency: 'PLN',
  cost: '1480.00',
  b_from: '1200.00',
  b_to: '1600.00',
  b_max: '1760.00',
  zone: 'up_to_b_to',
  over_budget: '0.00',
  needs_approval: false,
  kappa: null,
  gain_profile_id: null,
  gain_points: null,
  strict_plan_id: null,
  strict_cost: null,
  approval_status: 'not_needed',
})

/** Cost above B_do (in the margin up to B_max): the organizer must approve, price per point is kappa. */
export const needsApprovalBudget = (): PlanBudget => ({
  ...withinBudget(),
  cost: '1690.00',
  zone: 'in_margin',
  over_budget: '90.00',
  needs_approval: true,
  kappa: '3.00',
  gain_profile_id: PROFILE_IDS.babcia,
  gain_points: 30,
  strict_plan_id: '5d1c0e77-8a2b-4c3d-9e4f-60718293a4b5',
  strict_cost: '1580.00',
  approval_status: 'pending',
})

/** The base for the one night of the two-day trip; hard requirements are met. */
const lodging = (): NonNullable<Plan['lodging']> => ({
  name: 'Apartament na Pradze',
  lat: 52.2517,
  lon: 21.0364,
  nights: 1,
  cost_total: '420.00',
  s_h: 0.82,
  requirements: [],
})

export const plan = (tripId: string = TRIP_ID, overrides: Partial<Plan> = {}): Plan => ({
  id: '5d1c0e77-8a2b-4c3d-9e4f-60718293a4b6',
  trip_id: tripId,
  version: 1,
  input_hash: 'a'.repeat(64),
  plan_hash: 'a1b2c3d4e5f6',
  created_at: '2026-10-02T12:00:00Z',
  params: { alpha: 1, weight_preset: 'default' },
  days: days(),
  lodging: lodging(),
  fairness: {
    group_size: 5,
    jain: 0.94,
    min_r: 0.81,
    per_person: [
      person(PROFILE_IDS.mama, 'Ola', 74, 88, [80, 70, 75, 72, 70], 'cost'),
      person(PROFILE_IDS.tata, 'Marek', 71, 85, [78, 72, 68, 70, 66], 'lodging'),
      person(PROFILE_IDS.babcia, 'Babcia Halina', 62, 70, [60, 66, 55, 72, 58], 'pace'),
      person(PROFILE_IDS.zosia, 'Zosia', 77, 90, [88, 70, 64, 80, 70], 'pace'),
      person(PROFILE_IDS.antek, 'Antek', 58, 66, [52, 70, 50, 66, 60], 'attractions'),
    ],
  },
  floors_missed: [],
  violation: 0,
  conflicts: [],
  explain: [],
  verdicts: null,
  budget: withinBudget(),
  telemetry: { solver: 'stub', steps: 120, solo_runs: 5, elapsed_ms: 48 },
  ...overrides,
})

export const me = (overrides: Partial<Me> = {}): Me => ({
  sub: MOCK_USER_SUB,
  scopes: [],
  permissions: [],
  roles: [],
  is_admin: false,
  access: { trips: 'WRITE', 'trips.core': 'WRITE', 'profiles.core': 'WRITE' },
  ...overrides,
})

/** Accounts of the admin panel: 23 of them, every seventh blocked, three login providers. */
export const adminUsers = (count = 23): AdminUser[] => {
  const providers = ['auth0', 'google-oauth2', 'discord'] as const
  return Array.from({ length: count }, (_, index) => {
    const provider = providers[index % providers.length] ?? 'auth0'
    const day = String((index % 28) + 1).padStart(2, '0')
    return {
      sub: `${provider}|user-${index}`,
      email: `osoba${String(index).padStart(2, '0')}@example.com`,
      name: `Osoba ${index}`,
      provider,
      last_login: index % 5 === 4 ? null : `2026-10-${day}T09:00:00Z`,
      created_at: `2026-09-${day}T10:00:00Z`,
      blocked: index % 7 === 6,
    }
  })
}

export const INVITATION_ID = 'c5d8e1a0-3b7f-4a29-9e64-0d2f6b8a1c33'
/** The token of the invitation every scenario's host already holds (shown only once in reality). */
export const INVITATION_TOKEN = 'mock-invitation-token'

/** A working invitation: 3 of 10 places used, valid until far in the future. */
export const invitation = (overrides: Partial<Invitation> = {}): Invitation => ({
  id: INVITATION_ID,
  trip_id: TRIP_ID,
  created_by_sub: MOCK_USER_SUB,
  created_at: '2026-10-01T10:00:00Z',
  expires_at: '2036-10-08T10:00:00Z',
  max_uses: 10,
  uses: 3,
  revoked_at: null,
  profile_id: null,
  ...overrides,
})

export const city = (overrides: Partial<City> = {}): City => ({
  slug: 'warszawa',
  name: 'Warszawa',
  country: 'PL',
  timezone: 'Europe/Warsaw',
  currency: 'PLN',
  center_lat: 52.2297,
  center_lon: 21.0122,
  bbox_south: 52.09,
  bbox_west: 20.85,
  bbox_north: 52.37,
  bbox_east: 21.27,
  ...overrides,
})

/** The cities the planner covers (the four demo cities, two of them here). */
export const cities = (): City[] => [
  city(),
  city({
    slug: 'london',
    name: 'Londyn',
    country: 'GB',
    timezone: 'Europe/London',
    currency: 'GBP',
    center_lat: 51.5072,
    center_lon: -0.1276,
  }),
]

const CATALOG_IDS = {
  narodowe: '5d1c8e20-3b4a-4c75-9e2f-0000000000b1',
  zamek: '5d1c8e20-3b4a-4c75-9e2f-0000000000b2',
  lazienki: '5d1c8e20-3b4a-4c75-9e2f-0000000000b3',
  kopernik: '5d1c8e20-3b4a-4c75-9e2f-0000000000b4',
  polin: '5d1c8e20-3b4a-4c75-9e2f-0000000000b5',
} as const

export const CATALOG_PLACE_IDS = CATALOG_IDS

/** A catalog place of Warsaw with what the pool screen needs; the planning fields are neutral. */
const catalogPlace = (
  id: string,
  name: string,
  overrides: Partial<CatalogPlace> = {},
): CatalogPlace => ({
  id,
  city_slug: 'warszawa',
  name,
  category: 'museum',
  tags: ['museums'],
  lat: 52.23,
  lon: 21.02,
  osm_type: null,
  osm_id: null,
  google_place_id: null,
  hours: { opening_hours: null, source_url: null, verified: false, checked_at: null },
  prices: [],
  typical_visit_min: 90,
  segment_km: 0.5,
  transfer_min: 5,
  queue_min: 0,
  stairs: 0.2,
  wheelchair: true,
  indoor: true,
  iconic: false,
  cuisine: null,
  diet_tags: [],
  amenities: [],
  source_key: null,
  source: 'sheet',
  ...overrides,
})

/** The Warsaw catalog the liked and disliked places are searched in. */
export const catalogPlaces = (): CatalogPlace[] => [
  catalogPlace(CATALOG_IDS.narodowe, 'Muzeum Narodowe'),
  catalogPlace(CATALOG_IDS.zamek, 'Zamek Królewski', { category: 'attraction', tags: ['history'] }),
  catalogPlace(CATALOG_IDS.lazienki, 'Łazienki Królewskie', {
    category: 'park',
    tags: ['parks'],
    indoor: false,
  }),
  catalogPlace(CATALOG_IDS.kopernik, 'Centrum Nauki Kopernik', { tags: ['science', 'kids'] }),
  catalogPlace(CATALOG_IDS.polin, 'Muzeum Polin'),
]
/** The secret of the voting link a mock host creates (shown once, in the 201 answer). */
export const VOTE_TOKEN = 'mock-vote-token'
/** The voting link of a second person (Antek), to open two links one after the other. */
export const VOTE_TOKEN_OTHER = 'mock-vote-token-other'
export const VOTE_LINK_ID = 'c4e1f2a0-5b6d-4c7e-8f90-1a2b3c4d5e01'

export const voteLink = (overrides: Partial<VoteLink> = {}): VoteLink => ({
  id: VOTE_LINK_ID,
  profile_id: PROFILE_IDS.zosia,
  profile_name: 'Zosia',
  state: 'active',
  created_at: '2026-10-01T10:00:00Z',
  expires_at: '2036-10-15T10:00:00Z',
  revoked_at: null,
  last_used_at: null,
  ...overrides,
})

/** What the group said so far: Zosia wants the castle, nobody has vetoed anything. */
export const voteSummary = (): PlaceVoteSummary[] => [
  summaryRow(PLACE_IDS.zamek, 'Zamek Królewski', [
    ['want', null, 'app', PROFILE_IDS.mama, 'Ola'],
    ['want', null, 'link', PROFILE_IDS.zosia, 'Zosia'],
  ]),
  summaryRow(PLACE_IDS.kopernik, 'Centrum Nauki Kopernik', [
    ['dont_want', 'too_crowded', 'app', PROFILE_IDS.tata, 'Marek'],
  ]),
  summaryRow(PLACE_IDS.lazienki, 'Łazienki Królewskie', []),
]

function summaryRow(
  placeId: string,
  name: string,
  votes: [
    Schemas['RatingValue'],
    Schemas['ReasonCode'] | null,
    Schemas['VoteSource'],
    string,
    string,
  ][],
): PlaceVoteSummary {
  return {
    place_id: placeId,
    place_name: name,
    want: votes.filter(([value]) => value === 'want').length,
    dont_want: votes.filter(([value]) => value === 'dont_want').length,
    neutral: votes.filter(([value]) => value === 'neutral').length,
    veto_count: 0,
    votes: votes.map(([value, reason, source, profileId, displayName]) => ({
      profile_id: profileId,
      display_name: displayName,
      value,
      reason_code: reason,
      source,
      updated_at: '2026-10-02T10:00:00Z',
    })),
    vetoes: [],
  }
}

/** What the voting page of Zosia shows: the plan's places, nothing rated yet. */
export const votePlaces = (): VotePlace[] =>
  [
    [PLACE_IDS.zamek, 'Zamek Królewski', 'Zwiedzanie komnat i taras widokowy.'],
    [PLACE_IDS.kopernik, 'Centrum Nauki Kopernik', 'Doświadczenia dla dzieci i dorosłych.'],
    [PLACE_IDS.lazienki, 'Łazienki Królewskie', 'Spacer po parku z pawiami.'],
  ].map(([place_id, name, description]) => ({
    place_id: place_id as string,
    name: name as string,
    description: description as string,
    photo_url: null,
    rating: null,
    reason_code: null,
    veto_id: null,
  }))
