import { ApiError } from '@/api/errors'

export type PlanFailure =
  | { kind: 'catalog_missing'; jobId: string | null }
  | { kind: 'city_missing' }
  | { kind: 'forbidden' }
  | { kind: 'message'; text: string }
  | { kind: 'generic' }

/** A readable answer of the API: `detail` is a text or `{ code, message }`. */
function readDetail(detail: unknown): { code?: string; message?: string; jobId?: string } {
  if (typeof detail === 'string') return { message: detail }
  if (typeof detail !== 'object' || detail === null) return {}
  const pick = (key: string) => {
    const value = (detail as Record<string, unknown>)[key]
    return typeof value === 'string' ? value : undefined
  }
  return { code: pick('code'), message: pick('message'), jobId: pick('job_id') }
}

/** Sorts a failed "build plan" call into what the UI shows. */
export function classifyPlanFailure(error: unknown): PlanFailure {
  if (!(error instanceof ApiError)) return { kind: 'generic' }
  if (error.status === 403) return { kind: 'forbidden' }
  const { code, message, jobId } = readDetail(error.detail)
  if (error.status === 409 && code === 'catalog_missing') {
    return { kind: 'catalog_missing', jobId: jobId ?? null }
  }
  if (code === 'city_missing') return { kind: 'city_missing' }
  if (error.status === 422 && message) {
    return /needs a city/i.test(message)
      ? { kind: 'city_missing' }
      : { kind: 'message', text: message }
  }
  return { kind: 'generic' }
}
