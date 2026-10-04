import { HttpAgent } from '@ag-ui/client'
import { AGUI_PATH } from '@/lib/interview-constants'
import { currentAccessToken } from './client'
import { ApiError } from './errors'

export const interviewAguiUrl = (tripId: string) => `/api/v1/trips/${tripId}/${AGUI_PATH}`

/**
 * `fetch` for HttpAgent. It reads a fresh token for every run (Auth0 refreshes it silently), so a
 * long interview never sends an expired Bearer; `headers` on the agent would be a snapshot. A
 * non-2xx answer becomes an `ApiError`, so the hook reads the status (401 sign in again, 409 a
 * run is already going) instead of parsing a message.
 */
export async function authedFetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  const token = await currentAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  // A Request, not fetch(url): the URL is relative, and a Request resolves it against the page.
  const response = await fetch(new Request(url, { ...init, headers }))
  if (response.ok) return response
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => undefined)
  const detail =
    typeof body === 'object' && body !== null && 'detail' in body ? body.detail : undefined
  throw new ApiError(response.status, detail)
}

/** One HttpAgent per interview session; the session id is the AG-UI `threadId`. */
export function createInterviewAgent(tripId: string, threadId: string): HttpAgent {
  return new HttpAgent({
    url: interviewAguiUrl(tripId),
    threadId,
    initialState: {},
    fetch: authedFetch,
  })
}
