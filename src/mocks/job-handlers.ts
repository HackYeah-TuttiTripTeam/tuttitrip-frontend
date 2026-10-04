import { HttpResponse, http, type RequestHandler } from 'msw'
import type { Schemas } from '@/api/client'
import type { MockJob, World } from './scenarios'

const API = '*/api/v1'
const PERCENT_STEP = 40

/** Registers a job and returns its workflow id; `GET /jobs/{id}` then plays it out. */
export function startJob(world: World, job: Partial<MockJob> & Pick<MockJob, 'name'>): string {
  const workflowId = crypto.randomUUID()
  world.jobs[workflowId] = { pendingPolls: 1, outcome: 'SUCCESS', ...job }
  return workflowId
}

/** The state of a mock job now: `PENDING` with a growing percent, then the final status. */
export function jobState(world: World, workflowId: string): Schemas['JobState'] | null {
  const job = world.jobs[workflowId]
  if (!job) return null
  if (job.pendingPolls > 0) {
    job.pendingPolls -= 1
    return {
      workflow_id: workflowId,
      workflow_name: job.name,
      status: 'PENDING',
      progress: { stage: 'running', percent: Math.min(90, PERCENT_STEP * (1 + job.pendingPolls)) },
    }
  }
  return {
    workflow_id: workflowId,
    workflow_name: job.name,
    status: job.outcome,
    output: job.output ?? null,
    error: job.outcome === 'ERROR' ? 'The job failed' : null,
    error_code: job.errorCode ?? null,
    progress: null,
  }
}

export function jobHandlers(world: World, latency: () => Promise<void>): RequestHandler[] {
  return [
    http.get(`${API}/jobs/:workflowId`, async ({ params }) => {
      await latency()
      const state = jobState(world, String(params.workflowId))
      return state
        ? HttpResponse.json(state)
        : HttpResponse.json({ detail: 'Job not found' }, { status: 404 })
    }),
  ]
}
