import { HttpResponse, http, type RequestHandler } from 'msw'
import { startJob } from './job-handlers'
import type { World } from './scenarios'

const API = '*/api/v1'
const FOUND_PLACES = 142

/** Starts the fetch of the new city's places; a scenario can make the first job fail. */
function startFetch(world: World): string | null {
  const city = world.newCity
  if (!city) return null
  const outcome = city.failFirst && city.jobs === 0 ? 'ERROR' : 'SUCCESS'
  city.jobs += 1
  city.workflowId = startJob(world, {
    name: 'fetch_place_candidates',
    pendingPolls: 2,
    outcome,
    ...(outcome === 'ERROR' ? { errorCode: 'rate_limited' } : {}),
  })
  return city.workflowId
}

/**
 * What "Policz plan" answers for a city with no places: 409 `catalog_missing` with the job that
 * fetches them (started once, like the API's deterministic workflow id per city). Null when the
 * catalogue has the city.
 */
export function catalogMissingAnswer(world: World): Response | null {
  const city = world.newCity
  if (!city || city.fetched) return null
  const workflowId = city.workflowId ?? startFetch(world)
  return HttpResponse.json(
    {
      detail: {
        code: 'catalog_missing',
        message: 'The city has no places yet',
        city_slug: city.slug,
        job_id: workflowId,
      },
    },
    { status: 409 },
  )
}

/** Fetching places for a new city (backend #72): start, status and the places count. */
export function placesHandlers(world: World, latency: () => Promise<void>): RequestHandler[] {
  return [
    http.post(`${API}/trips/:tripId/places/candidates`, async () => {
      await latency()
      const workflowId = startFetch(world)
      return workflowId
        ? HttpResponse.json({ workflow_id: workflowId }, { status: 202 })
        : HttpResponse.json({ detail: 'The city is in the catalogue' }, { status: 409 })
    }),

    http.get(`${API}/trips/:tripId/places/candidates/status`, async ({ request }) => {
      await latency()
      const city = world.newCity
      if (!city) return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
      const jobId = new URL(request.url).searchParams.get('job_id') ?? city.workflowId
      const base = { city_slug: city.slug, job_id: jobId }
      const job = jobId ? world.jobs[jobId] : undefined
      if (!job) return HttpResponse.json({ ...base, state: 'empty', place_count: 0 })
      if (job.pendingPolls > 0) {
        job.pendingPolls -= 1
        return HttpResponse.json({ ...base, state: 'running', place_count: 0 })
      }
      if (job.outcome === 'ERROR') {
        return HttpResponse.json({
          ...base,
          state: 'failed',
          place_count: 0,
          error_code: job.errorCode ?? null,
          error: 'The job failed',
        })
      }
      city.fetched = true
      return HttpResponse.json({ ...base, state: 'ready', place_count: FOUND_PLACES })
    }),
  ]
}
