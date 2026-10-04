import { HttpResponse, http, type RequestHandler } from 'msw'
import { expense, MOCK_USER_SUB, PROFILE_IDS, type Trip } from './fixtures'
import { startJob } from './job-handlers'
import type { World } from './scenarios'

const API = '*/api/v1'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
/** A one-pixel JPEG for the stored-photo endpoint. */
const PIXEL = Uint8Array.from(
  atob(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  ),
  (char) => char.charCodeAt(0),
)

const unprocessable = (type: string) =>
  HttpResponse.json(
    { detail: [{ type, loc: ['body', 'file'], msg: 'The file is refused' }] },
    { status: 422 },
  )

/** Receipt upload, the reading and the confirmation (backend #87, #192) on top of the mock jobs. */
export function receiptHandlers(
  world: World,
  latency: () => Promise<void>,
  findTrip: (id: unknown) => Trip | undefined,
): RequestHandler[] {
  return [
    http.post(`${API}/trips/:tripId/expenses/receipts`, async ({ params, request }) => {
      await latency()
      if (!findTrip(params.tripId)) return HttpResponse.json({ detail: 'x' }, { status: 404 })
      if (world.settlementClosed) return HttpResponse.json({ detail: 'closed' }, { status: 409 })
      // The browser sends multipart. jsdom's FormData is not Node's, so in a test the body may not
      // parse: with no file to inspect the upload counts as good.
      const file = await request
        .formData()
        .then((form) => form.get('file'))
        .catch(() => null)
      if (file instanceof Blob) {
        if (file.size > MAX_BYTES) return unprocessable('receipt.too_large')
        if (!ALLOWED_TYPES.includes(file.type)) return unprocessable('receipt.type_not_allowed')
      }
      const workflowId = startJob(world, {
        name: 'read_receipt',
        outcome: world.receiptOutcome === 'failed' ? 'ERROR' : 'SUCCESS',
      })
      const evidenceId = crypto.randomUUID()
      world.receipts[evidenceId] = { workflowId, draftId: null }
      return HttpResponse.json(
        { workflow_id: workflowId, evidence_id: evidenceId },
        { status: 202 },
      )
    }),

    // Like the API, the first ask after the job succeeded writes the draft expense.
    http.get(`${API}/trips/:tripId/expenses/receipts/:evidenceId`, async ({ params }) => {
      await latency()
      const stored = world.receipts[String(params.evidenceId)]
      if (!stored) return HttpResponse.json({ detail: 'Receipt not found' }, { status: 404 })
      const job = world.jobs[stored.workflowId]
      if (job && job.pendingPolls > 0) {
        job.pendingPolls -= 1
        return HttpResponse.json({
          status: 'pending',
          expense: null,
          needs_confirmation: null,
          reasons: [],
        })
      }
      if (world.receiptOutcome === 'failed') {
        return HttpResponse.json({
          status: 'failed',
          expense: null,
          needs_confirmation: null,
          reasons: [],
        })
      }
      let draft = world.expenses.find((e) => e.id === stored.draftId)
      if (!draft) {
        draft = expense({
          id: crypto.randomUUID(),
          status: 'draft',
          has_evidence: true,
          amount: '87.40',
          trip_amount: '87.40',
          description: 'Biedronka',
          category: world.receiptOutcome === 'unsure' ? null : 'food',
          payer_profile_id: PROFILE_IDS.mama,
          created_by_sub: MOCK_USER_SUB,
        })
        stored.draftId = draft.id
        world.expenses.unshift(draft)
      }
      const unsure = world.receiptOutcome === 'unsure'
      return HttpResponse.json({
        status: 'ready',
        expense: draft,
        needs_confirmation: unsure,
        reasons: unsure ? ['The total is partly covered by a fold', 'No category found'] : [],
      })
    }),

    http.get(`${API}/trips/:tripId/expenses/receipts/:evidenceId/image`, async () => {
      await latency()
      return new HttpResponse(PIXEL, { headers: { 'Content-Type': 'image/jpeg' } })
    }),

    http.post(`${API}/trips/:tripId/expenses/:expenseId/confirm`, async ({ params, request }) => {
      await latency()
      const current = world.expenses.find((e) => e.id === params.expenseId)
      if (!current) return HttpResponse.json({ detail: 'Expense not found' }, { status: 404 })
      if (world.settlementClosed) return HttpResponse.json({ detail: 'closed' }, { status: 409 })
      if (current.status !== 'draft')
        return HttpResponse.json({ detail: 'Not a draft' }, { status: 409 })
      const body = (await request.json()) as Partial<typeof current>
      const confirmed = {
        ...current,
        ...body,
        amount: String(body.amount ?? current.amount),
        status: 'confirmed' as const,
        has_evidence: false,
      }
      world.expenses = world.expenses.map((e) => (e.id === confirmed.id ? confirmed : e))
      return HttpResponse.json(confirmed)
    }),
  ]
}
