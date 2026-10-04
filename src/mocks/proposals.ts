import { HttpResponse, http } from 'msw'
import type { Schemas } from '@/api/client'
import { MISSING_CITY_DETAIL } from '@/lib/constants'
import { type Member, type Plan, PROFILE_IDS, plan, TRIP_ID, type Trip } from './fixtures'

type Proposal = Schemas['ProposalRead']
type Answer = Schemas['ResponseRead']
type DraftPlan = Schemas['DraftPlanRead']

/** What the API stores of a proposal; the status and the tally are computed on every read. */
export interface ProposalState {
  id: string
  plan_id: string
  plan_hash: string
  plan_version: number
  sent_by_name: string
  sent_at: string
  responses: Answer[]
}

/** The part of a scenario's world the proposals and the draft plan read and change. */
export interface ProposalHost {
  trips: Trip[]
  members: Member[]
  plan: Plan | null
  proposal: ProposalState | null
}

export const PROPOSAL_ID = '8c6b4f20-3a1d-4e57-9b02-6f1d2c3b4a51'
const OTHER_PLAN_ID = '5d1c0e77-8a2b-4c3d-9e4f-60718293a4b7'
const CALLER_NAME = 'Ola'
const SENT_AT = '2026-10-03T09:00:00Z'

/** People with no account on the main trip: the proposal lists them apart. */
const WITHOUT_ACCOUNT = [
  { profile_id: PROFILE_IDS.zosia, display_name: 'Zosia' },
  { profile_id: PROFILE_IDS.antek, display_name: 'Antek' },
]

export const answer = (
  name: string,
  decision: Answer['decision'],
  at: string,
  remark: string | null = null,
  isMe = false,
): Answer => ({
  profile_id: isMe ? PROFILE_IDS.mama : `answer-${name}`,
  display_name: name,
  decision,
  remark,
  responded_at: `2026-10-03T${at}:00Z`,
  is_me: isMe,
})

/** A proposal for the plan the world holds, sent by Marek, with the given answers. */
export function sentProposal(world: ProposalHost, responses: Answer[] = []): ProposalState {
  const current = world.plan ?? plan(TRIP_ID)
  return {
    id: PROPOSAL_ID,
    plan_id: current.id,
    plan_hash: current.plan_hash,
    plan_version: current.version,
    sent_by_name: 'Marek',
    sent_at: SENT_AT,
    responses,
  }
}

/** A proposal about a plan version that is not the latest one any more. */
export const staleProposal = (world: ProposalHost): ProposalState => ({
  ...sentProposal(world),
  plan_id: OTHER_PLAN_ID,
  plan_version: 0,
})

function read(world: ProposalHost, stored: ProposalState): Proposal {
  const members = Math.max(world.members.length, stored.responses.length)
  const count = (decision: Answer['decision']) =>
    stored.responses.filter((entry) => entry.decision === decision).length
  const approvals = count('approve')
  const rejections = count('reject')
  const status: Proposal['status'] =
    world.plan && stored.plan_id !== world.plan.id
      ? 'outdated'
      : approvals === members
        ? 'approved'
        : rejections > 0
          ? 'rejected'
          : 'pending'
  return {
    ...stored,
    trip_id: world.plan?.trip_id ?? TRIP_ID,
    status,
    tally: {
      members,
      approvals,
      rejections,
      comments: count('comment'),
      waiting: Math.max(0, members - stored.responses.length),
    },
    profiles_without_account: WITHOUT_ACCOUNT,
  }
}

const ICS_BODY = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//TuttiTrip//mock//PL',
  'END:VCALENDAR',
  '',
].join('\r\n')

interface Env {
  api: string
  world: ProposalHost
  latency: () => Promise<void>
  findTrip: (id: unknown) => Trip | undefined
  canWrite: (id: unknown) => boolean
}

const notFound = (detail: string) => HttpResponse.json({ detail }, { status: 404 })
const forbidden = () =>
  HttpResponse.json({ detail: 'Brak uprawnienia do tej operacji' }, { status: 403 })

/** Proposals, the calendar file and the draft plan of the interview, as the API answers them. */
export function proposalHandlers({ api, world, latency, findTrip, canWrite }: Env) {
  return [
    http.get(`${api}/trips/:tripId/proposals/current`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      return world.proposal
        ? HttpResponse.json(read(world, world.proposal))
        : notFound('No proposal')
    }),

    http.post(`${api}/trips/:tripId/proposals`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      if (!canWrite(params.tripId)) return forbidden()
      if (!world.plan) return notFound('No plan')
      world.proposal = sentProposal(world)
      return HttpResponse.json(read(world, world.proposal), { status: 201 })
    }),

    http.put(`${api}/trips/:tripId/proposals/:proposalId/response`, async ({ params, request }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      const stored = world.proposal
      if (!stored || stored.id !== params.proposalId) return notFound('No proposal')
      if (world.plan && stored.plan_id !== world.plan.id) {
        return HttpResponse.json(
          {
            detail: {
              code: 'proposal.outdated',
              message: 'The plan changed after the proposal was sent',
              latest_plan_id: world.plan.id,
            },
          },
          { status: 409 },
        )
      }
      const body = (await request.json()) as {
        decision: Answer['decision']
        remark: string | null
      }
      if (body.decision === 'comment' && !body.remark) {
        return HttpResponse.json({ detail: 'A comment needs a remark' }, { status: 422 })
      }
      const mine = answer(CALLER_NAME, body.decision, '12:00', body.remark, true)
      stored.responses = [mine, ...stored.responses.filter((entry) => !entry.is_me)]
      return HttpResponse.json(read(world, stored))
    }),

    http.get(`${api}/trips/:tripId/plans/:planId/calendar.ics`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId)) return notFound('Trip not found')
      const stored = world.proposal
      if (
        !stored ||
        stored.plan_id !== params.planId ||
        read(world, stored).status !== 'approved'
      ) {
        return HttpResponse.json(
          {
            detail: {
              code: 'plan.not_approved',
              message: 'No approved proposal for this plan version',
            },
          },
          { status: 409 },
        )
      }
      return new HttpResponse(ICS_BODY, { headers: { 'Content-Type': 'text/calendar' } })
    }),

    // "Zbuduj plan teraz": needs only the city. The mock also accepts a destination the scripted
    // assistant wrote, because it never sets the catalogue slug.
    http.post(`${api}/trips/:tripId/interview/draft-plan`, async ({ params }) => {
      await latency()
      const found = findTrip(params.tripId)
      if (!found) return notFound('Trip not found')
      if (!canWrite(params.tripId)) return forbidden()
      if (!found.city_slug && !found.destination) {
        return HttpResponse.json({ detail: MISSING_CITY_DETAIL }, { status: 422 })
      }
      const version = (world.plan?.version ?? 0) + 1
      const created = plan(found.id, {
        id: crypto.randomUUID(),
        version,
        plan_hash: `d${String(version).padStart(11, '0')}`,
        params: { alpha: 1, weight_preset: 'default', draft: true },
      })
      world.plan = created
      const assumptions: DraftPlan['assumptions'] = []
      if (!found.start_date || !found.end_date) {
        assumptions.push({
          code: 'dates',
          params: { start_date: '2026-10-10', days: 1 },
          text: 'Założyłem jeden dzień: najbliższą sobotę (10.10.2026).',
        })
      }
      if (!found.budget_total_max) {
        assumptions.push({ code: 'budget', text: 'Bez budżetu: plan nie ogranicza kosztów.' })
      }
      assumptions.push({
        code: 'people',
        params: { adults: 2 },
        text: 'Założyłem dwoje dorosłych.',
      })
      const body: DraftPlan = {
        plan_id: created.id,
        version,
        plan_hash: created.plan_hash,
        assumptions,
      }
      return HttpResponse.json(body, { status: 201 })
    }),
  ]
}
