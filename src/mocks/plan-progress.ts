import { HttpResponse, http } from 'msw'
import type { Schemas } from '@/api/client'
import { PLAN_PROGRESS_STEPS } from '@/lib/plan-progress'

type Progress = Schemas['PlanProgressRead']

/** Travellers the mock pretends to run a reference point for. */
const MOCK_PEOPLE = 4

let running: Progress | null = null

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Walks through the stages like the API does while it computes a plan, `stageMs` on each (the
 * reference runs and the budget plans get a share of it). With 0 it does nothing, so tests that
 * answer at once see no stage. The request the caller wraps in this is the one that computes.
 */
export async function runPlanStages(stageMs: number): Promise<void> {
  if (stageMs <= 0) return
  try {
    for (const [index, step] of PLAN_PROGRESS_STEPS.entries()) {
      const items = step === 'reference' ? MOCK_PEOPLE : step === 'budget' ? 2 : null
      for (let item = 1; item <= (items ?? 1); item += 1) {
        running = {
          step,
          position: index + 1,
          total: PLAN_PROGRESS_STEPS.length,
          item: items ? item : null,
          items,
        }
        await wait(items ? stageMs / items : stageMs)
      }
    }
  } finally {
    running = null
  }
}

/** `GET /trips/{id}/plans/progress`: the stage of the run in flight, or null. */
export const planProgressHandler = (api: string) =>
  http.get(`${api}/trips/:tripId/plans/progress`, () => HttpResponse.json(running))
