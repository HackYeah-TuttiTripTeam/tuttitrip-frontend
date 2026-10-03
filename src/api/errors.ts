export type ApiProblem = 'unauthorized' | 'not_found' | 'offline' | 'unknown'

/** Maps an openapi-fetch / fetch error to something the UI can explain. */
export function classifyApiError(error: unknown): ApiProblem {
  if (error instanceof TypeError) return 'offline'
  if (typeof error === 'object' && error !== null && 'detail' in error) {
    const { detail } = error
    if (detail === 'Missing bearer token' || detail === 'Invalid token') return 'unauthorized'
    // The API answers 404 the same way for a missing trip and for a trip of someone else.
    if (detail === 'Trip not found') return 'not_found'
    // A path id that is not a UUID (422) cannot name a trip either.
    if (Array.isArray(detail) && detail.some(isPathValidationError)) return 'not_found'
  }
  return 'unknown'
}

function isPathValidationError(item: unknown): boolean {
  return (
    typeof item === 'object' &&
    item !== null &&
    'loc' in item &&
    Array.isArray(item.loc) &&
    item.loc[0] === 'path'
  )
}
