import { delay, HttpResponse, http, type RequestHandler } from 'msw'
import type { Schemas } from '@/api/client'
import {
  INVITATION_TOKEN,
  invitation,
  MOCK_DEMO_TOKEN,
  MOCK_USER_SUB,
  type Plan,
  PROFILE_IDS,
  type Preferences,
  type Profile,
  plan,
  preferences,
  TRIP_ID,
  type Trip,
  trip,
  VOTE_TOKEN,
  VOTE_TOKEN_OTHER,
  voteLink,
  votePlaces,
} from './fixtures'
import { permissionHandlers } from './permissions'
import { createWorld, type ScenarioName, type World } from './scenarios'

const API = '*/api/v1'

const notFound = (detail: string) => HttpResponse.json({ detail }, { status: 404 })
const NO_STORE = { 'Cache-Control': 'no-store' }
/** One answer for every dead token, as the API gives: no hint whether it expired or never existed. */
const deadInvitation = () =>
  HttpResponse.json({ detail: 'Invitation not found' }, { status: 404, headers: NO_STORE })
const forbidden = () =>
  HttpResponse.json({ detail: 'Brak uprawnienia do tej operacji' }, { status: 403 })

const unauthorized = () => HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
const serverError = () => HttpResponse.json({ detail: 'Internal Server Error' }, { status: 500 })

/** The voting token of a request: sent in the header, and still working. */
const liveToken = (request: Request, world: World) => {
  const token = request.headers.get('X-Access-Token')
  return (token === VOTE_TOKEN || token === VOTE_TOKEN_OTHER) && world.vote.link === 'ok'
}

/** Whose link it is: the second token belongs to Antek, who has rated nothing. */
const profileNameFor = (request: Request, world: World) =>
  request.headers.get('X-Access-Token') === VOTE_TOKEN_OTHER ? 'Antek' : world.vote.profileName

function paged<T>(items: T[], page: number, size: number) {
  return {
    items: items.slice((page - 1) * size, page * size),
    total: items.length,
    page,
    size,
    pages: Math.ceil(items.length / size),
  }
}

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

/** GET /trips like the API: filters, sort and the page come from the query string. */
function listTrips(all: Trip[], params: URLSearchParams) {
  const q = params.get('q')?.toLowerCase()
  const roles = params.getAll('role')
  const from = params.get('start_from')
  const to = params.get('start_to')
  if (from && to && to < from) {
    return HttpResponse.json({ detail: 'start_to is before start_from' }, { status: 422 })
  }
  const matching = all.filter(
    (t) =>
      (!q || t.name.toLowerCase().includes(q) || (t.destination ?? '').toLowerCase().includes(q)) &&
      (!params.get('city') || t.city_slug === params.get('city')) &&
      (!params.get('kind') || t.kind === params.get('kind')) &&
      (roles.length === 0 || roles.includes(t.my_role)) &&
      (!from || (t.start_date != null && t.start_date >= from)) &&
      (!to || (t.start_date != null && t.start_date <= to)),
  )
  const sort = params.get('sort') ?? 'created_at'
  const sign = params.get('dir') === 'asc' ? 1 : -1
  const key = (t: Trip) =>
    sort === 'name' ? t.name : sort === 'start_date' ? t.start_date : t.created_at
  // Like the backend: a trip without a start date goes last in both directions.
  matching.sort((a, b) => {
    const [x, y] = [key(a), key(b)]
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1
    return sign * x.localeCompare(y)
  })
  const size = Math.min(100, Math.max(1, Number(params.get('size')) || 20))
  const page = Math.max(1, Number(params.get('page')) || 1)
  return HttpResponse.json({
    items: matching.slice((page - 1) * size, page * size),
    total: matching.length,
    page,
    size,
    pages: Math.ceil(matching.length / size),
  })
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
    // The jury's one-link entry. Like the real API: no-store, and 404 for every bad or disabled token.
    http.post(`${API}/auth/demo`, async ({ request }) => {
      await latency()
      if (world.demoRateLimited) {
        return HttpResponse.json(
          { detail: 'Too many requests' },
          { status: 429, headers: NO_STORE },
        )
      }
      const body = (await request.json().catch(() => null)) as { token?: unknown } | null
      if (!world.demoEnabled || body?.token !== MOCK_DEMO_TOKEN) return notFound('Not found')
      return HttpResponse.json(
        { access_token: 'mock-demo-access-token', expires_in: 3600 },
        { headers: NO_STORE },
      )
    }),

    ...permissionHandlers(world.permissions, () => world.me, latency),
    http.get(`${API}/me`, async () => {
      await latency()
      return HttpResponse.json(world.me)
    }),

    http.get(`${API}/trips`, async ({ request }) => {
      await latency()
      return listTrips(world.trips, new URL(request.url).searchParams)
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
      // Your own profile, or any as a co-host or higher.
      if (!canWrite(params.tripId) && !isMe(world, String(params.profileId))) return forbidden()
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

    // Preferences. Constraints are hidden from a plain member looking at someone else, like in the API.
    http.get(`${API}/trips/:tripId/preferences`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      return HttpResponse.json(
        world.profiles
          .filter((p) => p.trip_id === params.tripId)
          .map((p) => viewPreferences(world, p.id, canWrite(params.tripId))),
      )
    }),

    http.get(`${API}/trips/:tripId/profiles/:profileId/preferences`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      if (!world.profiles.some((p) => p.id === params.profileId))
        return notFound('Profile not found')
      return HttpResponse.json(
        viewPreferences(world, String(params.profileId), canWrite(params.tripId)),
      )
    }),

    http.put(
      `${API}/trips/:tripId/profiles/:profileId/preferences`,
      async ({ params, request }) => {
        await latency()
        if (!findTrip(params.tripId)) return notFound('Trip not found')
        const profile = world.profiles.find((p) => p.id === params.profileId)
        if (!profile) return notFound('Profile not found')
        if (!canWrite(params.tripId) && !isMe(world, profile.id)) return forbidden()
        if (world.preferencesSaveFails)
          return HttpResponse.json({ detail: 'Internal Server Error' }, { status: 500 })
        const body = (await request.json()) as Schemas['PreferencesWrite']
        const pool = body.importance_pool
        if (pool && Object.values(pool).reduce((sum, points) => sum + points, 0) !== 10)
          return HttpResponse.json({ detail: 'The pool must add up to 10' }, { status: 422 })
        const current = storedPreferences(world, profile.id)
        // Like the API: entries with a place_id are ratings, a PUT never takes one away.
        const { example_places: examples = current.example_places, ...rest } = body
        const typed = examples.filter((place) => !place.place_id)
        const catalog = [
          ...current.example_places.filter(
            (place) => place.place_id && !examples.some((e) => e.place_id === place.place_id),
          ),
          ...examples.filter((place) => place.place_id),
        ]
        Object.assign(current, withoutUndefined(rest), {
          example_places: [...typed, ...catalog],
          filled: true,
          updated_by_sub: MOCK_USER_SUB,
          updated_at: new Date().toISOString(),
        })
        return HttpResponse.json(viewPreferences(world, profile.id, true))
      },
    ),

    // Catalog and ratings. A rating is merged into `example_places` of the preferences, like in the API.
    http.get(`${API}/places`, async ({ request }) => {
      await latency()
      const city = new URL(request.url).searchParams.get('city')
      return HttpResponse.json(world.places.filter((place) => place.city_slug === city))
    }),

    http.put(
      `${API}/trips/:tripId/profiles/:profileId/ratings/:placeId`,
      async ({ params, request }) => {
        await latency()
        if (!findTrip(params.tripId)) return notFound('Trip not found')
        const profile = world.profiles.find((p) => p.id === params.profileId)
        if (!profile) return notFound('Profile not found')
        if (!canWrite(params.tripId) && !isMe(world, profile.id)) return forbidden()
        const place = world.places.find((p) => p.id === params.placeId)
        if (!place) return notFound('Place not found')
        if (world.preferencesSaveFails)
          return HttpResponse.json({ detail: 'Internal Server Error' }, { status: 500 })
        const body = (await request.json()) as Schemas['RatingUpdate']
        const current = storedPreferences(world, profile.id)
        current.example_places = current.example_places.filter((e) => e.place_id !== place.id)
        if (body.value !== 'neutral')
          current.example_places.push({
            name: place.name,
            place_id: place.id,
            verdict: body.value === 'want' ? 'like' : 'dislike',
          })
        return HttpResponse.json({
          trip_id: String(params.tripId),
          profile_id: profile.id,
          place_id: place.id,
          value: body.value,
          reason_code: body.reason_code ?? null,
          updated_by_sub: MOCK_USER_SUB,
          updated_at: new Date().toISOString(),
        })
      },
    ),

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
          named_profile_id: world.join.namedFor,
          claimable_profiles: world.profiles
            .filter((p) => world.join.claimable.includes(p.id) && !p.user_sub)
            .map((p) => ({
              profile_id: p.id,
              display_name: p.display_name,
              age_group: p.age_group,
            })),
        },
        { headers: NO_STORE },
      )
    }),

    http.post(`${API}/invitations/accept`, async ({ request }) => {
      await latency()
      const body = (await request.json()) as Schemas['InvitationAccept']
      if (!body.token || world.join.preview === 'dead' || world.join.accept === 'dead')
        return deadInvitation()
      const claimed = body.profile_id ?? world.join.namedFor
      if (claimed) {
        const profile = world.profiles.find((p) => p.id === claimed)
        if (!profile) return notFound('Profile not found')
        const lost = world.join.taken.includes(claimed) || Boolean(profile.user_sub)
        const wrongName = world.join.namedFor !== null && world.join.namedFor !== claimed
        if (lost || wrongName) {
          world.join.claimable = world.join.claimable.filter((id) => id !== claimed)
          return HttpResponse.json({ detail: 'Profile is taken' }, { status: 409 })
        }
      }
      return HttpResponse.json(
        {
          trip_id: world.trips[0]?.id ?? TRIP_ID,
          profile_id: claimed ?? PROFILE_IDS.mama,
          role: 'member',
          already_member: world.join.alreadyMember,
          profile_claimed: claimed !== null,
        },
        { headers: NO_STORE },
      )
    }),

    // Voting links of the host. Like the real API the token is in the 201 answer only, and
    // creating a link for a person with an account is a 409.
    http.get(`${API}/trips/:tripId/vote-links`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      if (!canWrite(params.tripId)) return forbidden()
      return HttpResponse.json(paged(world.voteLinks, 1, 100))
    }),

    http.post(`${API}/trips/:tripId/vote-links`, async ({ params, request }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      if (!canWrite(params.tripId)) return forbidden()
      const body = (await request.json()) as Schemas['VoteLinkCreate']
      const profile = world.profiles.find((p) => p.id === body.profile_id)
      if (!profile) return notFound('Profile not found')
      if (profile.user_sub) return HttpResponse.json({ detail: 'Has an account' }, { status: 409 })
      const created = voteLink({
        id: crypto.randomUUID(),
        profile_id: profile.id,
        profile_name: profile.display_name,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + body.expires_in_days * 86_400_000).toISOString(),
      })
      world.voteLinks.unshift(created)
      return HttpResponse.json(
        { ...created, token: VOTE_TOKEN, url: `/glos#t=${VOTE_TOKEN}` },
        { status: 201, headers: NO_STORE },
      )
    }),

    http.delete(`${API}/trips/:tripId/vote-links/:linkId`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      if (!canWrite(params.tripId)) return forbidden()
      const found = world.voteLinks.find((link) => link.id === params.linkId)
      if (!found) return notFound('Voting link not found')
      found.state = 'revoked'
      found.revoked_at ??= new Date().toISOString()
      return HttpResponse.json(found)
    }),

    // The group's answers; filtered, sorted and cut into pages like the API does.
    http.get(`${API}/trips/:tripId/vote-summary`, async ({ params, request }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      if (!canWrite(params.tripId)) return forbidden()
      const query = new URL(request.url).searchParams
      const source = query.get('source')
      const hasVeto = query.get('has_veto')
      const sort = query.get('sort') ?? 'name'
      const rows = world.voteSummary
        .filter((row) => !source || [...row.votes, ...row.vetoes].some((v) => v.source === source))
        .filter((row) => hasVeto === null || row.veto_count > 0 === (hasVeto === 'true'))
      const key = { want: 'want', dont_want: 'dont_want', veto: 'veto_count' } as const
      const sorted =
        sort === 'name'
          ? rows.toSorted((a, b) => a.place_name.localeCompare(b.place_name))
          : rows.toSorted(
              (a, b) => b[key[sort as keyof typeof key]] - a[key[sort as keyof typeof key]],
            )
      return HttpResponse.json(
        paged(sorted, Number(query.get('page') ?? 1), Number(query.get('size') ?? 20)),
      )
    }),

    // The voting page without an account (contract of backend#81): the token is the whole login.
    http.get(`${API}/vote/session`, async ({ request }) => {
      await latency()
      if (!liveToken(request, world)) return unauthorized()
      return HttpResponse.json({
        trip_name: world.trips[0]?.name ?? '',
        profile_name: profileNameFor(request, world),
        places: profileNameFor(request, world) === 'Antek' ? votePlaces() : world.vote.places,
      })
    }),

    http.put(`${API}/vote/ratings/:placeId`, async ({ params, request }) => {
      await latency()
      if (!liveToken(request, world)) return unauthorized()
      if (world.vote.writeFails) return serverError()
      const place = world.vote.places.find((p) => p.place_id === params.placeId)
      if (!place) return notFound('Place not found')
      const body = (await request.json()) as {
        value: Schemas['RatingValue']
        reason_code?: Schemas['ReasonCode'] | null
      }
      if (body.value === 'dont_want' && !body.reason_code) return unprocessable([])
      place.rating = body.value
      place.reason_code = body.value === 'dont_want' ? (body.reason_code ?? null) : null
      return HttpResponse.json(place)
    }),

    http.post(`${API}/vote/vetoes`, async ({ request }) => {
      await latency()
      if (!liveToken(request, world)) return unauthorized()
      if (world.vote.writeFails) return serverError()
      const body = (await request.json()) as { place_id: string }
      const place = world.vote.places.find((p) => p.place_id === body.place_id)
      if (!place) return notFound('Place not found')
      place.veto_id ??= crypto.randomUUID()
      // The host sees it in the summary: the same veto, from the link.
      const row = world.voteSummary.find((r) => r.place_id === place.place_id)
      if (row && row.veto_count === 0) {
        row.veto_count = 1
        row.vetoes.push({
          veto_id: place.veto_id,
          profile_id: PROFILE_IDS.zosia,
          display_name: world.vote.profileName,
          source: 'link',
          created_at: new Date().toISOString(),
        })
      }
      return HttpResponse.json(place)
    }),

    http.delete(`${API}/vote/vetoes/:vetoId`, async ({ params, request }) => {
      await latency()
      if (!liveToken(request, world)) return unauthorized()
      if (world.vote.writeFails) return serverError()
      const place = world.vote.places.find((p) => p.veto_id === params.vetoId)
      if (!place) return notFound('Veto not found')
      place.veto_id = null
      const row = world.voteSummary.find((r) => r.place_id === place.place_id)
      if (row) {
        row.vetoes = row.vetoes.filter((v) => v.veto_id !== params.vetoId)
        row.veto_count = row.vetoes.length
      }
      return HttpResponse.json(place)
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
const isMe = (world: World, profileId: string) =>
  world.members.some((member) => member.profile_id === profileId && member.is_me)

/** The stored preferences of a person; a person nobody filled in gets the age defaults. */
function storedPreferences(world: World, profileId: string): Preferences {
  let found = world.preferences.find((p) => p.profile_id === profileId)
  if (!found) {
    found = preferences(profileId)
    world.preferences.push(found)
  }
  return found
}

/**
 * What the caller sees: the whole thing for the person and for co-hosts and above, without the
 * constraints for a plain member looking at someone else. The stairs value follows the constraints.
 */
function viewPreferences(world: World, profileId: string, isManager: boolean): Preferences {
  const stored = storedPreferences(world, profileId)
  const sensitivity = world.profiles.find((p) => p.id === profileId)?.stairs_sensitivity ?? 0.2
  const sees = isManager || isMe(world, profileId)
  const strict = stored.constraints?.stairs || stored.constraints?.wheelchair
  return structuredClone({
    ...stored,
    constraints: sees ? stored.constraints : null,
    effective_stairs_sensitivity: sees ? (strict ? 1 : sensitivity) : null,
  })
}

const withoutUndefined = <T extends object>(body: T): Partial<T> =>
  Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined)) as Partial<T>
