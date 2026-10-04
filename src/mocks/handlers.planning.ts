import { HttpResponse, http, type RequestHandler } from 'msw'
import type { Schemas } from '@/api/client'
import {
  type Decision,
  type DecisionEffects,
  MOCK_USER_SUB,
  type Plan,
  type PlanStop,
  type PlanVerdict,
} from './fixtures'
import type { World } from './scenarios'

const API = '*/api/v1'

/** The cost of a decision the mock quotes: forcing a place is dearer and slower, blocking saves. */
function effectsOf(world: World, kind: Schemas['OverrideKind']): DecisionEffects {
  const forcing = kind === 'must'
  return {
    d_min_r: forcing ? -0.04 : 0.02,
    d_jain: forcing ? -0.01 : 0.005,
    d_r: (world.plan?.fairness.per_person ?? []).map((person, index) => ({
      profile_id: person.profile_id,
      d_r: forcing ? (index === 0 ? 0.03 : -0.04) : index === 0 ? -0.02 : 0.02,
    })),
    d_cost: forcing ? '120.00' : '-60.00',
    d_minutes: forcing ? 25 : -30,
  }
}

const stopFor = (placeId: string): PlanStop => ({
  place_id: placeId,
  name: 'Wymuszone miejsce',
  kind: 'attraction',
  lat: 52.23,
  lon: 21.01,
  start: '17:45:00',
  end: '18:30:00',
  transfer: null,
  cost_per_person: '0.00',
  price_base: '0.00',
  price_inflated: '0.00',
  price_verified: false,
  price_source_url: null,
  price_verified_at: null,
  hours_verified: false,
  hours_source_url: null,
  hours_verified_at: null,
  google_place_id: null,
})

/** Puts the decision into the plan the next "recompute" would return. */
function applyToPlan(plan: Plan, placeId: string, kind: Schemas['OverrideKind']): Plan {
  const verdicts: PlanVerdict[] = (plan.verdicts ?? []).map((verdict) =>
    verdict.place_id === placeId
      ? kind === 'must'
        ? { ...verdict, verdict: 'must', skip_codes: [] }
        : { ...verdict, verdict: 'skip', skip_codes: ['blocked'] }
      : verdict,
  )
  const days = plan.days.map((day, index) => ({
    ...day,
    items:
      kind === 'block'
        ? day.items.filter((stop) => stop.place_id !== placeId)
        : index === 0
          ? [...day.items, stopFor(placeId)]
          : day.items,
  }))
  return { ...plan, version: plan.version + 1, verdicts, days }
}

let counter = 0
const nextId = () => `11111111-0000-4000-8000-${String(++counter).padStart(12, '0')}`

/** Verdict-related writes: the host's override, the decision log and the budget consent. */
export function planningHandlers(world: World, latency: () => Promise<void>): RequestHandler[] {
  const findTrip = (id: unknown) => world.trips.find((candidate) => candidate.id === id)
  const notFound = () => HttpResponse.json({ detail: 'Trip not found' }, { status: 404 })
  const forbidden = () =>
    HttpResponse.json({ detail: 'Brak uprawnienia do tej operacji' }, { status: 403 })
  const isHost = (id: unknown) => findTrip(id)?.my_role === 'host'

  /** "must" on a place with a veto runs into a hard rule, like the API's E0 check. */
  const conflict = (placeId: string, kind: Schemas['OverrideKind']) => {
    const vetoed = world.plan?.verdicts?.find(
      (verdict) => verdict.place_id === placeId && verdict.skip_codes?.includes('veto'),
    )
    if (kind !== 'must' || !vetoed) return null
    return HttpResponse.json(
      {
        detail: 'A "must" runs into a veto',
        conflicts: [{ reason_code: 'veto_blocks_place', place_id: placeId }],
      },
      { status: 409 },
    )
  }

  const log = (entry: Omit<Decision, 'id' | 'trip_id' | 'created_by_sub' | 'created_at'>) => {
    const decision: Decision = {
      id: nextId(),
      trip_id: world.trips[0]?.id ?? '',
      created_by_sub: MOCK_USER_SUB,
      created_at: '2026-10-04T08:30:00Z',
      ...entry,
    }
    world.decisions.unshift(decision)
    return decision
  }

  return [
    http.post(`${API}/trips/:tripId/overrides/preview`, async ({ params, request }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound()
      if (!isHost(params.tripId)) return forbidden()
      const body = (await request.json()) as Schemas['OverrideCreate']
      const blocked = conflict(body.place_id, body.kind)
      if (blocked) return blocked
      return HttpResponse.json({
        kind: body.kind,
        place_id: body.place_id,
        effects: effectsOf(world, body.kind),
      })
    }),

    http.post(`${API}/trips/:tripId/overrides`, async ({ params, request }) => {
      await latency()
      const trip = findTrip(params.tripId)
      if (!trip) return notFound()
      if (!isHost(params.tripId)) return forbidden()
      const body = (await request.json()) as Schemas['OverrideCreate']
      const blocked = conflict(body.place_id, body.kind)
      if (blocked) return blocked
      const effects = effectsOf(world, body.kind)
      const decision = log({
        kind: body.kind,
        place_id: body.place_id,
        reason: body.reason ?? null,
        effects,
      })
      if (world.plan) world.plan = applyToPlan(world.plan, body.place_id, body.kind)
      return HttpResponse.json(
        {
          id: decision.id,
          trip_id: trip.id,
          place_id: body.place_id,
          kind: body.kind,
          reason: decision.reason,
          created_by_sub: MOCK_USER_SUB,
          created_at: decision.created_at,
          revoked_at: null,
          effects,
        },
        { status: 201 },
      )
    }),

    http.get(`${API}/trips/:tripId/decisions`, async ({ params, request }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound()
      const url = new URL(request.url)
      const kind = url.searchParams.get('kind')
      const page = Number(url.searchParams.get('page') ?? 1)
      const size = Number(url.searchParams.get('size') ?? 20)
      const dir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc'
      const matching = world.decisions
        .filter((decision) => kind === null || decision.kind === kind)
        .sort((a, b) => (a.created_at < b.created_at ? -1 : 1) * (dir === 'asc' ? 1 : -1))
      return HttpResponse.json({
        items: matching.slice((page - 1) * size, page * size),
        total: matching.length,
        page,
        size,
        pages: Math.ceil(matching.length / size),
      })
    }),

    // Budget consent (backend#77, not in the schema yet): the endpoints as the issue describes them.
    http.get(`${API}/trips/:tripId/budget-approvals`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound()
      const status = world.plan?.budget.approval_status ?? 'not_needed'
      return HttpResponse.json(status === 'not_needed' ? [] : [{ id: APPROVAL_ID, status }])
    }),

    http.post(`${API}/trips/:tripId/budget-approvals/:approvalId/:decision`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId) || !world.plan) return notFound()
      if (!isHost(params.tripId)) return forbidden()
      const approve = params.decision === 'approve'
      const { budget } = world.plan
      const noChange = { d_min_r: 0, d_jain: 0, d_r: [], d_cost: budget.over_budget, d_minutes: 0 }
      log({
        kind: 'budget_approval',
        place_id: null,
        reason: approve ? 'approved' : 'rejected',
        effects: noChange,
      })
      world.plan = {
        ...world.plan,
        budget: approve
          ? { ...budget, approval_status: 'approved' }
          : {
              ...budget,
              cost: budget.strict_cost ?? budget.cost,
              zone: 'up_to_b_to',
              over_budget: '0.00',
              needs_approval: false,
              kappa: null,
              approval_status: 'rejected',
            },
      }
      return HttpResponse.json({ id: APPROVAL_ID, status: approve ? 'approved' : 'rejected' })
    }),
  ]
}

const APPROVAL_ID = '22222222-0000-4000-8000-000000000001'
