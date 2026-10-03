export type ApiProblem = 'unauthorized' | 'offline' | 'unknown'

/** Maps an openapi-fetch / fetch error to something the UI can explain. */
export function classifyApiError(error: unknown): ApiProblem {
  if (error instanceof TypeError) return 'offline'
  if (typeof error === 'object' && error !== null && 'detail' in error) {
    const { detail } = error
    if (detail === 'Missing bearer token' || detail === 'Invalid token') return 'unauthorized'
  }
  return 'unknown'
}
