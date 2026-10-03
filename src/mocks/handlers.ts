import { delay, HttpResponse, http, type RequestHandler } from 'msw'
import type { Schemas } from '@/api/client'
import { me, type Plan, type Profile, plan, TRIP_ID, trip } from './fixtures'
import { createWorld, type ScenarioName, type World } from './scenarios'

const API = '*/api/v1'

const notFound = (detail: string) => HttpResponse.json({ detail }, { status: 404 })
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
    ? normalHandlers(world, latency)
    : brokenHandlers(world.behaviour, latency)
}

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

    http.post(`${API}/trips`, async ({ request }) => {
      await latency()
      const body = (await request.json()) as Schemas['TripCreate']
      const created = trip({
        id: crypto.randomUUID(),
        name: body.name,
        destination: body.destination ?? null,
        created_at: new Date().toISOString(),
        start_date: null,
        end_date: null,
        budget_total_min: null,
        budget_total_max: null,
      })
      world.trips.unshift(created)
      return HttpResponse.json(created, { status: 201 })
    }),

    http.get(`${API}/trips/:tripId`, async ({ params }) => {
      await latency()
      const found = findTrip(params.tripId)
      return found ? HttpResponse.json(found) : notFound('Trip not found')
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
      for (const field of COMFORT_FIELDS)
        if (field in changed && !current.customized_fields.includes(field))
          current.customized_fields.push(field)
      return HttpResponse.json(current)
    }),

    http.delete(`${API}/trips/:tripId/profiles/:profileId`, async ({ params }) => {
      await latency()
      if (!canWrite(params.tripId)) return forbidden()
      const index = world.profiles.findIndex((p) => p.id === params.profileId)
      if (index < 0) return notFound('Profile not found')
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

/** Same bands as the API: toddler under 4, child under 13, teen under 18, adult under 65. */
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
