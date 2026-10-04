export type ApiProblem = 'unauthorized' | 'not_found' | 'conflict' | 'offline' | 'unknown'

/** Thrown by the client for every non-2xx answer, so callers read the status instead of the text. */
export class ApiError extends Error {
  readonly status: number
  /** The `detail` field of the API's JSON error body, if there was one. */
  readonly detail: unknown
  /** The whole JSON error body, for answers that carry more than `detail` (a 409 with conflicts). */
  readonly body: unknown

  constructor(status: number, detail: unknown, body?: unknown) {
    super(`API answered ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.body = body
  }
}

/** Maps a failed API call to something the UI can explain. */
export function classifyApiError(error: unknown): ApiProblem {
  if (error instanceof TypeError) return 'offline'
  if (!(error instanceof ApiError)) return 'unknown'
  if (error.status === 401) return 'unauthorized'
  // The API answers 404 the same way for a missing trip and for a trip of someone else.
  if (error.status === 404) return 'not_found'
  if (error.status === 409) return 'conflict'
  // A path id that is not a UUID (422) cannot name a trip either.
  if (error.status === 422 && isPathValidationError(error.detail)) return 'not_found'
  return 'unknown'
}

function isPathValidationError(detail: unknown): boolean {
  return (
    Array.isArray(detail) &&
    detail.some(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'loc' in item &&
        Array.isArray(item.loc) &&
        item.loc[0] === 'path',
    )
  )
}
