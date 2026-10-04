import { HttpResponse, http, type RequestHandler } from 'msw'
import type { Schemas } from '@/api/client'
import type { PendingSchemas } from '@/api/pending-paths'
import type { Trip } from './fixtures'
import { startJob } from './job-handlers'
import type { World } from './scenarios'

const API = '*/api/v1'

/** The rules of the linter in the report's order, with the weight each has in the API. */
const RULES: [code: string, weight: number][] = [
  ['closed_day', 5],
  ['opening_hours', 4],
  ['transfer', 2],
  ['budget', 4],
  ['unknown_place', 1],
  ['distance', 3],
  ['pace', 3],
  ['rest_window', 2],
  ['accessibility', 4],
  ['accommodation_requirements', 4],
]

const finding = (rule: string, message: string, extra: Partial<Schemas['Finding']> = {}) => ({
  rule,
  severity: 'violation' as const,
  message,
  ...extra,
})

/** A lint report from the findings per rule: every rule is present, also with zero violations. */
export function lintReport(
  findings: Record<string, Schemas['Finding'][]> = {},
): Schemas['LintReport'] {
  const results = RULES.map(([rule, weight]) => {
    const violations = findings[rule] ?? []
    return { rule, weight, count: violations.length, violations, warnings: [] }
  })
  return {
    results,
    count: results.reduce((sum, result) => sum + result.count, 0),
    score: results.reduce((sum, result) => sum + result.count * result.weight, 0),
    digest: 'a1b2c3d4e5f6',
  }
}

const CAFE_INDEX = 3

const UNRECOGNIZED: PendingSchemas['PasteUnrecognized'][] = [
  {
    index: 3,
    name: 'Kawiarnia nad rzeką',
    day: '2026-10-12',
    candidates: [
      {
        place_id: 'c0000000-0000-4000-8000-000000000001',
        name: 'Cafe Vistula',
        address: 'Wybrzeże Kościuszkowskie 20',
        score: 0.62,
      },
      {
        place_id: 'c0000000-0000-4000-8000-000000000002',
        name: 'Kawiarnia Pod Mostem',
        address: 'Bulwary Wiślane',
        score: 0.48,
      },
    ],
  },
  {
    index: 7,
    name: 'Restauracja Pod Dębem',
    day: '2026-10-13',
    candidates: [
      {
        place_id: 'c0000000-0000-4000-8000-000000000003',
        name: 'Pod Dębem',
        address: 'ul. Dębowa 3',
        score: 0.55,
      },
    ],
  },
]

/** The chatbot's plan: five violations, and two stops the matcher could not place. */
function pastedReport(resolved: number[]): PendingSchemas['PasteReport'] {
  const findings: Record<string, Schemas['Finding'][]> = {
    closed_day: [
      finding('closed_day', 'Muzeum jest zamknięte w poniedziałek', {
        day: '2026-10-12',
        place_name: 'Muzeum Narodowe',
      }),
    ],
    opening_hours: [
      finding('opening_hours', 'Wizyta kończy się po zamknięciu o 17:00', {
        day: '2026-10-13',
        place_name: 'Zamek Królewski',
      }),
    ],
    transfer: [
      finding('transfer', 'Przejazd 52 minuty między punktami o tej samej godzinie', {
        day: '2026-10-13',
      }),
    ],
    pace: [
      finding('pace', 'Dziewięć punktów w jeden dzień', {
        day: '2026-10-12',
        person_name: 'Babcia Halina',
      }),
    ],
    accessibility: [
      finding('accessibility', 'Schody bez windy dla osoby z ograniczeniem', {
        day: '2026-10-13',
        place_name: 'Wieża widokowa',
        person_name: 'Babcia Halina',
      }),
    ],
    unknown_place: UNRECOGNIZED.filter((item) => !resolved.includes(item.index)).map((item) =>
      finding('unknown_place', `Nie rozpoznano miejsca: ${item.name}`, { day: item.day }),
    ),
  }
  // A stop that got matched is checked by the other rules now; the cafe's hours do not fit.
  if (resolved.includes(CAFE_INDEX)) {
    findings.opening_hours = [
      ...(findings.opening_hours ?? []),
      finding('opening_hours', 'Wizyta poza godzinami otwarcia: Kawiarnia nad rzeką', {
        place_name: 'Kawiarnia nad rzeką',
      }),
    ]
  }
  return {
    status: 'ready',
    report: lintReport(findings),
    unrecognized: UNRECOGNIZED.filter((item) => !resolved.includes(item.index)),
  }
}

/** The linter of the trip's plan and of a pasted one (backend #66), on top of the mock jobs. */
export function linterHandlers(
  world: World,
  latency: () => Promise<void>,
  findTrip: (id: unknown) => Trip | undefined,
): RequestHandler[] {
  return [
    // The solver's plan has no violations: the number the jury compares with.
    http.post(`${API}/trips/:tripId/linter/plans/:planId`, async ({ params }) => {
      await latency()
      if (!findTrip(params.tripId) || !world.plan) {
        return HttpResponse.json({ detail: 'Plan not found' }, { status: 404 })
      }
      return HttpResponse.json(lintReport())
    }),

    http.post(`${API}/trips/:tripId/linter/pastes`, async ({ params, request }) => {
      await latency()
      if (!findTrip(params.tripId)) return HttpResponse.json({ detail: 'x' }, { status: 404 })
      const body = (await request.json()) as { text?: string }
      if (!body.text?.trim() || body.text.length > 20_000) {
        return HttpResponse.json({ detail: 'Text length' }, { status: 422 })
      }
      const workflowId = startJob(world, { name: 'parse_pasted_plan' })
      const pasteId = crypto.randomUUID()
      world.pastes[pasteId] = { workflowId, resolved: [] }
      return HttpResponse.json({ workflow_id: workflowId, paste_id: pasteId }, { status: 202 })
    }),

    http.get(`${API}/trips/:tripId/linter/pastes/:pasteId`, async ({ params }) => {
      await latency()
      const stored = world.pastes[String(params.pasteId)]
      if (!stored) return HttpResponse.json({ detail: 'Paste not found' }, { status: 404 })
      const job = world.jobs[stored.workflowId]
      if (job && job.pendingPolls > 0) {
        job.pendingPolls -= 1
        return HttpResponse.json({ status: 'pending', report: null, unrecognized: [] })
      }
      return HttpResponse.json(pastedReport(stored.resolved))
    }),

    http.patch(`${API}/trips/:tripId/linter/pastes/:pasteId/items/:index`, async ({ params }) => {
      await latency()
      const stored = world.pastes[String(params.pasteId)]
      if (!stored) return HttpResponse.json({ detail: 'Paste not found' }, { status: 404 })
      if (findTrip(params.tripId)?.my_role === 'member') {
        return HttpResponse.json({ detail: 'Forbidden' }, { status: 403 })
      }
      stored.resolved = [...new Set([...stored.resolved, Number(params.index)])]
      return HttpResponse.json(pastedReport(stored.resolved))
    }),
  ]
}
