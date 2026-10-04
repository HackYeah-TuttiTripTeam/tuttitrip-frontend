import { HttpResponse, http, type RequestHandler } from 'msw'
import type { Schemas } from '@/api/client'
import type { Offer, RequirementItem } from './fixtures'
import { MOCK_USER_SUB, profile } from './fixtures'
import type { World } from './scenarios'

const API = '*/api/v1'

type Check = Schemas['RequirementCheck']

/** Words that tell a pasted offer has an amenity (Polish and English, lower case). */
const AMENITY_WORDS: Record<string, string[]> = {
  pool: ['basen', 'pool'],
  kitchen: ['kuchni', 'kitchen'],
  parking: ['parking'],
  family_room: ['rodzinn', 'family room'],
  wifi: ['wi-fi', 'wifi'],
  breakfast: ['śniadani', 'breakfast'],
  balcony: ['balkon', 'balcony'],
}

const DOMAINS = { airbnb: 'airbnb.', booking: 'booking.' } as const

/** The sentence of the offer that mentions a word, as a quote. */
function quoteAround(text: string, words: string[]): string | null {
  for (const sentence of text.split(/(?<=[.!?\n])\s*/)) {
    const lower = sentence.toLowerCase()
    if (words.some((word) => lower.includes(word))) return sentence.trim()
  }
  return null
}

/** The three-state check of one requirement against a pasted text, like the API's rules. */
function checkRequirement(item: RequirementItem, text: string, url: string | null): Check {
  const base = { feature: item.key, kind: item.kind, hard: item.hard, confidence: null }
  if (item.kind === 'platform') {
    if (!url) return { ...base, status: 'unconfirmed', quote: null, reason: 'no_link' }
    const host = new URL(url).hostname
    const matches = host.includes(DOMAINS[item.key as keyof typeof DOMAINS])
    return { ...base, status: matches ? 'met' : 'unmet', quote: host, reason: null }
  }
  if (item.kind === 'distance') {
    return { ...base, status: 'unconfirmed', quote: null, reason: 'not_checked' }
  }
  const words = AMENITY_WORDS[item.key] ?? [item.key.replaceAll('_', ' ')]
  const quote = quoteAround(text, words)
  if (!quote) return { ...base, status: 'unconfirmed', quote: null, reason: 'no_mention' }
  const denied = /\b(brak|bez|no|without|nie ma)\b/i.test(quote)
  return { ...base, status: denied ? 'unmet' : 'met', quote, reason: null }
}

const STATE_VALUE: Record<Check['status'], number> = { met: 1, unconfirmed: 0.4, unmet: 0 }

/** S_h of E2: the product over the hard requirements times the mean over the soft ones. */
function score(checks: Check[]): number {
  const value = (check: Check) => STATE_VALUE[check.status]
  const hard = checks.filter((check) => check.hard).map(value)
  const soft = checks.filter((check) => !check.hard).map(value)
  const hardProduct = hard.reduce((product, v) => product * v, 1)
  const softMean = soft.length > 0 ? soft.reduce((sum, v) => sum + v, 0) / soft.length : 1
  return Math.round(hardProduct * softMean * 100) / 100
}

/** The offer as the API returns it on every read: checks follow the current requirements. */
function readOffer(world: World, offer: Offer): Offer {
  const text = world.documents.get(offer.document_id) ?? ''
  const { requirements, version } = world.requirements
  const checks = requirements.map((item) => checkRequirement(item, text, offer.url))
  return {
    ...offer,
    state: offer.state === 'pending' ? 'done' : offer.state,
    stale: version !== offer.requirements_version,
    checks,
    score: score(checks),
  }
}

let counter = 0
const nextId = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`

/** Lodging requirements, pasted offers and the search links of the main trip. */
export function accommodationHandlers(
  world: World,
  latency: () => Promise<void>,
): RequestHandler[] {
  const findTrip = (id: unknown) => world.trips.find((candidate) => candidate.id === id)
  const notFound = () => HttpResponse.json({ detail: 'Trip not found' }, { status: 404 })
  const forbidden = () =>
    HttpResponse.json({ detail: 'Brak uprawnienia do tej operacji' }, { status: 403 })
  const unprocessable = (detail: string) => HttpResponse.json({ detail }, { status: 422 })

  return [
    http.get(`${API}/trips/:tripId/accommodation/requirements`, async ({ params }) => {
      await latency()
      return findTrip(params.tripId) ? HttpResponse.json(world.requirements) : notFound()
    }),

    http.put(`${API}/trips/:tripId/accommodation/requirements`, async ({ params, request }) => {
      await latency()
      const trip = findTrip(params.tripId)
      if (!trip) return notFound()
      if (trip.my_role === 'member') return forbidden()
      if (trip.kind === 'outing') return unprocessable('An outing has no lodging')
      const body = (await request.json()) as Schemas['RequirementsWrite']
      const requirements = body.requirements ?? []
      const same = JSON.stringify(requirements) === JSON.stringify(world.requirements.requirements)
      world.requirements = {
        requirements,
        version: same ? world.requirements.version : world.requirements.version + 1,
      }
      return HttpResponse.json(world.requirements)
    }),

    http.post(`${API}/planning/linter/trips/:tripId/documents`, async ({ params, request }) => {
      await latency()
      const trip = findTrip(params.tripId)
      if (!trip) return notFound()
      if (trip.my_role === 'member') return forbidden()
      const body = (await request.json()) as Schemas['DocumentCreate']
      if (body.text.trim() === '') return unprocessable('Empty text')
      const id = nextId()
      world.documents.set(id, body.text)
      return HttpResponse.json(
        {
          id,
          trip_id: trip.id,
          kind: body.kind,
          created_by: MOCK_USER_SUB,
          created_at: '2026-10-04T08:00:00Z',
        },
        { status: 201 },
      )
    }),

    http.post(`${API}/trips/:tripId/accommodation/offers`, async ({ params, request }) => {
      await latency()
      const trip = findTrip(params.tripId)
      if (!trip) return notFound()
      if (trip.my_role === 'member') return forbidden()
      if (trip.kind === 'outing') return unprocessable('An outing has no lodging')
      const body = (await request.json()) as Schemas['OfferCreate']
      if (!world.documents.has(body.document_id)) return unprocessable('Unknown document')
      const offer: Offer = {
        id: nextId(),
        trip_id: trip.id,
        document_id: body.document_id,
        nights: body.nights,
        url: body.url ?? null,
        platform: null,
        state: 'pending',
        job_id: nextId(),
        error_code: null,
        requirements_version: world.requirements.version,
        stale: false,
        checks: world.requirements.requirements.map((item) => ({
          feature: item.key,
          kind: item.kind,
          hard: item.hard,
          status: 'unconfirmed' as const,
          quote: null,
          confidence: null,
          reason: 'pending' as const,
        })),
        score: 0,
        created_at: '2026-10-04T08:00:00Z',
      }
      world.offers.unshift(offer)
      return HttpResponse.json(offer, { status: 202 })
    }),

    http.get(`${API}/trips/:tripId/accommodation/offers/:offerId`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound()
      const offer = world.offers.find((candidate) => candidate.id === params.offerId)
      if (!offer) return HttpResponse.json({ detail: 'Offer not found' }, { status: 404 })
      // The first read after the paste finishes the check, so the screen shows pending, then done.
      const read = readOffer(world, offer)
      offer.state = 'done'
      return HttpResponse.json(read)
    }),

    http.get(`${API}/trips/:tripId/accommodation/search-links`, async ({ params }) => {
      await latency()
      const trip = findTrip(params.tripId)
      if (!trip) return notFound()
      if (trip.kind === 'outing' || !trip.start_date || !trip.end_date) {
        return unprocessable('The trip needs dates and more than one day')
      }
      const nights = Math.round(
        (Date.parse(trip.end_date) - Date.parse(trip.start_date)) / (24 * 60 * 60 * 1000),
      )
      const onlyPlatform = world.requirements.requirements.find((item) => item.kind === 'platform')
      const platforms = onlyPlatform ? [onlyPlatform.key] : ['airbnb', 'booking']
      const people = world.profiles.length > 0 ? world.profiles : [profile('x', 'x', 30, 'adult')]
      const query = [
        { name: 'checkin', value: trip.start_date, official: true },
        { name: 'checkout', value: trip.end_date, official: true },
      ]
      const links = platforms.map((platform) => ({
        platform: platform as Schemas['Platform'],
        url: `https://www.${platform}.com/search?q=Warszawa&checkin=${trip.start_date}`,
        fallback_url: `https://www.${platform}.com/`,
        params:
          platform === 'airbnb'
            ? [...query, { name: 'price_max', value: '800', official: false }]
            : query,
      }))
      const body: Schemas['SearchLinksRead'] = {
        check_in: trip.start_date,
        check_out: trip.end_date,
        nights,
        adults: people.filter((person) => person.age >= 18).length,
        child_ages: people.filter((person) => person.age < 18).map((person) => person.age),
        area: trip.destination,
        price_per_night: trip.budget_total_max
          ? {
              amount: Math.floor(Number(trip.budget_total_max) / nights),
              currency: trip.currency ?? 'PLN',
              basis: 'budget_total_max_per_night',
            }
          : null,
        platforms_restricted: onlyPlatform !== undefined,
        requirements_version: world.requirements.version,
        links,
      }
      return HttpResponse.json(body)
    }),

    http.post(
      `${API}/trips/:tripId/accommodation/search-links/opened`,
      async ({ params, request }) => {
        await latency()
        const trip = findTrip(params.tripId)
        if (!trip) return notFound()
        if (trip.my_role === 'member') return forbidden()
        const body = (await request.json()) as Schemas['SearchOpenWrite']
        const opening: Schemas['SearchOpeningRead'] = {
          id: nextId(),
          platform: body.platform,
          url: `https://www.${body.platform}.com/`,
          params: [],
          actor_sub: MOCK_USER_SUB,
          opened_at: '2026-10-04T08:00:00Z',
        }
        world.searchOpenings.unshift(opening)
        return HttpResponse.json(opening, { status: 201 })
      },
    ),

    http.get(`${API}/trips/:tripId/accommodation/search-links/opened`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound()
      const items = world.searchOpenings
      return HttpResponse.json({ items, total: items.length, page: 1, size: 20, pages: 1 })
    }),
  ]
}
