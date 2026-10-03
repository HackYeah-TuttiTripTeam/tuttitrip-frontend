import { delay, HttpResponse, http, type RequestHandler } from 'msw'
import type { Schemas } from '@/api/client'
import {
  INVITATION_TOKEN,
  invitation,
  me,
  type Plan,
  PROFILE_IDS,
  type Profile,
  plan,
  TRIP_ID,
  type Trip,
  trip,
} from './fixtures'
import { createWorld, type ScenarioName, type World } from './scenarios'

const API = '*/api/v1'

const notFound = (detail: string) => HttpResponse.json({ detail }, { status: 404 })
const NO_STORE = { 'Cache-Control': 'no-store' }
/** One answer for every dead token, as the API gives: no hint whether it expired or never existed. */
const deadInvitation = () =>
  HttpResponse.json({ detail: 'Invitation not found' }, { status: 404, headers: NO_STORE })
const forbidden = () =>
  HttpResponse.json({ detail: 'Brak uprawnienia do tej operacji' }, { status: 403 })

export interface HandlerOptions {
  /** Artificial latency so loading states are visible in the browser; 0 in tests. */
  delayMs?: number
  /** Changes the scenario's data before serving it, for a state no named scenario has. */
  tweak?: (world: World) => void
}

/** Request handlers for one scenario. Each call starts from fresh data. */
export function createHandlers(name: ScenarioName, { delayMs = 0, tweak }: HandlerOptions = {}) {
  const world = createWorld(name)
  tweak?.(world)
  const latency = async () => {
    if (delayMs > 0) await delay(delayMs)
  }
  return world.behaviour === 'normal'
    ? [...normalHandlers(world, latency), ...noRealApi]
    : brokenHandlers(world.behaviour, latency)
}

/**
 * Last in the list: an /api call no handler above knows is answered here, never passed on to the
 * backend (in the browser the Vite dev server would proxy it to the real API).
 */
const noRealApi = [
  // A regular expression on the whole URL: the glob */api/* would also catch Vite's source
  // modules under /src/api/ in the browser.
  http.all(/^https?:\/\/[^/]+\/api\//, ({ request }) =>
    HttpResponse.json(
      { detail: `No mock handler for ${request.method} ${new URL(request.url).pathname}` },
      { status: 501 },
    ),
  ),
]

function brokenHandlers(behaviour: 'server-error' | 'offline', latency: () => Promise<void>) {
  return [
    http.all(`${API}/*`, async () => {
      await latency()
      return behaviour === 'offline'
        ? HttpResponse.error()
        : HttpResponse.json({ detail: 'Internal Server Error' }, { status: 500 })
    }),
  ]
}

function normalHandlers(world: World, latency: () => Promise<void>): RequestHandler[] {
  const findTrip = (id: unknown) => world.trips.find((candidate) => candidate.id === id)
  const canWrite = (id: unknown) => findTrip(id)?.my_role !== 'member'

  return [
    http.get(`${API}/me`, async () => {
      await latency()
      return HttpResponse.json(me())
    }),

    http.get(`${API}/trips`, async () => {
      await latency()
      return HttpResponse.json(world.trips)
    }),

    http.get(`${API}/places/cities`, async () => {
      await latency()
      return HttpResponse.json(world.cities)
    }),

    // Like the API: the whole body at once, rules checked on the merged trip.
    http.post(`${API}/trips`, async ({ request }) => {
      await latency()
      if (world.failures.post) return failure(world.failures.post)
      if (world.validationErrors) return unprocessable(world.validationErrors)
      const body = (await request.json()) as Schemas['TripCreate']
      const created = mergeTrip(
        trip({
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          destination: null,
          start_date: null,
          end_date: null,
          city_slug: null,
          currency: null,
          budget_total_min: null,
          budget_total_max: null,
          budget_day_min: null,
          budget_day_max: null,
          my_role: 'host',
        }),
        body,
      )
      const errors = checkTrip(created, body)
      if (errors.length > 0) return HttpResponse.json({ detail: errors }, { status: 422 })
      world.trips.unshift(created)
      return HttpResponse.json(created, { status: 201 })
    }),

    http.get(`${API}/trips/:tripId`, async ({ params }) => {
      await latency()
      const found = findTrip(params.tripId)
      return found ? HttpResponse.json(found) : notFound('Trip not found')
    }),

    http.patch(`${API}/trips/:tripId`, async ({ params, request }) => {
      await latency()
      const found = findTrip(params.tripId)
      if (!found) return notFound('Trip not found')
      if (!canWrite(params.tripId)) return forbidden()
      if (world.failures.patch) return failure(world.failures.patch)
      if (world.validationErrors) return unprocessable(world.validationErrors)
      const body = (await request.json()) as Schemas['TripUpdate']
      const merged = mergeTrip(found, body)
      const errors = checkTrip(merged, body)
      if (errors.length > 0) return HttpResponse.json({ detail: errors }, { status: 422 })
      world.trips = world.trips.map((t) => (t.id === merged.id ? merged : t))
      return HttpResponse.json(merged)
    }),

    http.delete(`${API}/trips/:tripId`, async ({ params }) => {
      await latency()
      const found = findTrip(params.tripId)
      if (!found) return notFound('Trip not found')
      if (found.my_role !== 'host') return forbidden()
      if (world.failures.delete) return failure(world.failures.delete)
      world.trips = world.trips.filter((t) => t.id !== found.id)
      return new HttpResponse(null, { status: 204 })
    }),

    http.get(`${API}/trips/:tripId/profiles`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      return HttpResponse.json(world.profiles.filter((p) => p.trip_id === params.tripId))
    }),

    http.post(`${API}/trips/:tripId/profiles`, async ({ params, request }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      if (!canWrite(params.tripId)) return forbidden()
      const body = (await request.json()) as Schemas['ProfileCreate']
      const created: Profile = {
        id: crypto.randomUUID(),
        trip_id: String(params.tripId),
        display_name: body.display_name,
        age: body.age,
        age_group: ageGroup(body.age),
        user_sub: body.user_sub ?? null,
        weight: 1,
        segment_km: body.segment_km ?? 3,
        daily_km: body.daily_km ?? 12,
        active_min: body.active_min ?? 600,
        stairs_sensitivity: body.stairs_sensitivity ?? 0.2,
        queue_patience_min: body.queue_patience_min ?? 40,
        nap_start: body.nap_start ?? null,
        nap_minutes: body.nap_minutes ?? 0,
        floor: body.floor ?? 30,
        customized_fields: [],
      }
      world.profiles.push(created)
      return HttpResponse.json(created, { status: 201 })
    }),

    http.patch(`${API}/trips/:tripId/profiles/:profileId`, async ({ params, request }) => {
      await latency()
      if (!canWrite(params.tripId)) return forbidden()
      const current = world.profiles.find((p) => p.id === params.profileId)
      if (!current) return notFound('Profile not found')
      const body = (await request.json()) as Schemas['ProfileUpdate']
      const changed = withoutNulls(body)
      Object.assign(current, changed)
      // Null clears the nap start; for every other field it means "not given".
      if (body.nap_start === null) current.nap_start = null
      for (const field of COMFORT_FIELDS)
        if (field in body && !current.customized_fields.includes(field))
          current.customized_fields.push(field)
      return HttpResponse.json(current)
    }),

    http.delete(`${API}/trips/:tripId/profiles/:profileId`, async ({ params }) => {
      await latency()
      if (!canWrite(params.tripId)) return forbidden()
      const index = world.profiles.findIndex((p) => p.id === params.profileId)
      if (index < 0) return notFound('Profile not found')
      // A person with an account is removed as a member, not as a profile.
      if (world.profiles[index]?.user_sub) {
        return HttpResponse.json({ detail: 'Profile belongs to an account' }, { status: 409 })
      }
      world.profiles.splice(index, 1)
      return new HttpResponse(null, { status: 204 })
    }),

    // Members are the profiles that have an account; the Osoby view joins both on profile_id.
    http.get(`${API}/trips/:tripId/members`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      return HttpResponse.json(world.members)
    }),

    http.patch(`${API}/trips/:tripId/members/:profileId`, async ({ params, request }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      if (findTrip(params.tripId)?.my_role !== 'host') return forbidden()
      const member = world.members.find((m) => m.profile_id === params.profileId)
      if (!member) return notFound('Member not found')
      if (member.role === 'host') return forbidden()
      const body = (await request.json()) as Schemas['MemberRoleUpdate']
      member.role = body.role
      return HttpResponse.json(member)
    }),

    http.delete(`${API}/trips/:tripId/members/:profileId`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      if (findTrip(params.tripId)?.my_role !== 'host') return forbidden()
      const index = world.members.findIndex((m) => m.profile_id === params.profileId)
      if (index < 0) return notFound('Member not found')
      world.members.splice(index, 1)
      const profile = world.profiles.find((p) => p.id === params.profileId)
      if (profile) profile.user_sub = null
      return new HttpResponse(null, { status: 204 })
    }),

    // Invitations. The token is shown once, in the 201 answer; every answer that touches it is
    // no-store, like the real API.
    http.get(`${API}/trips/:tripId/invitations`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      if (!canWrite(params.tripId)) return forbidden()
      return HttpResponse.json(world.invitations)
    }),

    http.post(`${API}/trips/:tripId/invitations`, async ({ params, request }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      if (!canWrite(params.tripId)) return forbidden()
      const body = (await request.json()) as Schemas['InvitationCreate']
      const created = invitation({
        id: crypto.randomUUID(),
        trip_id: String(params.tripId),
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + body.expires_in_days * 86_400_000).toISOString(),
        max_uses: body.max_uses,
        uses: 0,
      })
      world.invitations.unshift(created)
      return HttpResponse.json(
        { ...created, token: INVITATION_TOKEN },
        { status: 201, headers: NO_STORE },
      )
    }),

    http.delete(`${API}/trips/:tripId/invitations/:invitationId`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      if (!canWrite(params.tripId)) return forbidden()
      const found = world.invitations.find((candidate) => candidate.id === params.invitationId)
      if (!found) return notFound('Invitation not found')
      found.revoked_at ??= new Date().toISOString()
      return HttpResponse.json(found)
    }),

    http.post(`${API}/invitations/preview`, async ({ request }) => {
      await latency()
      const body = (await request.json()) as Schemas['InvitationToken']
      if (!body.token || world.join.preview === 'dead') return deadInvitation()
      const main = world.trips[0]
      return HttpResponse.json(
        {
          trip_name: main?.name ?? '',
          destination: main?.destination ?? null,
          already_member: world.join.alreadyMember,
        },
        { headers: NO_STORE },
      )
    }),

    http.post(`${API}/invitations/accept`, async ({ request }) => {
      await latency()
      const body = (await request.json()) as Schemas['InvitationAccept']
      if (!body.token || world.join.preview === 'dead' || world.join.accept === 'dead')
        return deadInvitation()
      return HttpResponse.json(
        {
          trip_id: world.trips[0]?.id ?? TRIP_ID,
          profile_id: PROFILE_IDS.mama,
          role: 'member',
          already_member: world.join.alreadyMember,
        },
        { headers: NO_STORE },
      )
    }),

    http.get(`${API}/trips/:tripId/plans/latest`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      return world.plan && world.plan.trip_id === params.tripId
        ? HttpResponse.json(world.plan)
        : notFound('No plan yet')
    }),

    // "Policz plan": the first call creates the plan (201), later calls with the same input
    // return the existing version (200), like the real API.
    http.post(`${API}/trips/:tripId/plans`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      if (!canWrite(params.tripId)) return forbidden()
      if (world.plan?.trip_id === params.tripId) return HttpResponse.json(world.plan)
      const created: Plan = plan(String(params.tripId ?? TRIP_ID))
      world.plan = created
      return HttpResponse.json(created, { status: 201 })
    }),
  ]
}

const COMFORT_FIELDS = [
  'segment_km',
  'daily_km',
  'active_min',
  'stairs_sensitivity',
  'queue_patience_min',
  'nap_start',
  'nap_minutes',
  'floor',
] as const

/**
 * Same bands as the API's age defaults (profiles/logic/age_defaults.py). A copy, so drift shows up
 * in scenarios.test.ts, which checks the age groups of the family.
 * Toddler under 4, child under 13, teen under 18, adult under 65.
 */
function ageGroup(age: number): Profile['age_group'] {
  if (age < 4) return 'toddler'
  if (age < 13) return 'child'
  if (age < 18) return 'teen'
  return age < 65 ? 'adult' : 'senior'
}

/** JSON bodies use null for "not given"; the stored value must keep its default then. */
function withoutNulls<T extends object>(body: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== null),
  ) as Partial<T>
}

const unprocessable = (detail: Schemas['TripValidationError'][]) =>
  HttpResponse.json({ detail }, { status: 422 })

const failure = (status: number) => HttpResponse.json({ detail: 'Mock failure' }, { status })

const MONEY_KEYS = [
  'budget_total_min',
  'budget_total_max',
  'budget_day_min',
  'budget_day_max',
] as const

/** Applies the keys a create/PATCH body sent (a sent null clears); money is stored as "x.xx". */
function mergeTrip(base: Trip, body: Schemas['TripUpdate'] | Schemas['TripCreate']): Trip {
  const merged = { ...base } as Record<string, unknown>
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue
    merged[key] =
      (MONEY_KEYS as readonly string[]).includes(key) && value !== null
        ? Number(value).toFixed(2)
        : value
  }
  const next = merged as unknown as Trip
  const sameDay = next.start_date !== null && next.start_date === next.end_date
  return { ...next, kind: sameDay ? 'outing' : 'trip' }
}

/** The API's trip rules (check_trip, complete) with its stable error codes. */
function checkTrip(merged: Trip, sent: object): Schemas['TripValidationError'][] {
  const errors: Schemas['TripValidationError'][] = []
  const add = (type: Schemas['TripErrorCode'], field: string, msg: string) =>
    errors.push({ type, loc: ['body', field], msg })
  for (const field of ['name', 'day_start', 'day_end', 'budget_flex_pct', 'fairness_alpha']) {
    if (field in sent && (sent as Record<string, unknown>)[field] === null) {
      add('trip.null_not_allowed', field, `${field} cannot be null`)
    }
  }
  const pairs = [
    ['start_date', 'end_date', 'trip.dates_order'],
    ['budget_total_min', 'budget_total_max', 'trip.budget_order'],
    ['budget_day_min', 'budget_day_max', 'trip.budget_order'],
  ] as const
  for (const [lower, upper, orderCode] of pairs) {
    const lo = merged[lower]
    const hi = merged[upper]
    if ((lo === null) !== (hi === null)) {
      const missing = lo === null ? lower : upper
      add('trip.pair_required', missing, `${missing} is required with its pair`)
    } else if (lo !== null && hi !== null) {
      const ordered = lower === 'start_date' ? hi >= lo : Number(hi) >= Number(lo)
      if (!ordered) add(orderCode, upper, `${upper} must not be before ${lower}`)
    }
  }
  if (merged.day_end <= merged.day_start) {
    add('trip.day_window_order', 'day_end', 'day_end must be after day_start')
  }
  return errors
}
