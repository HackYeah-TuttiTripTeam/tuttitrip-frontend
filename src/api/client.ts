import createFetchClient, { type Middleware } from 'openapi-fetch'
import createClient from 'openapi-react-query'
import {
  getDemoInvitation,
  getDemoToken,
  markDemoExpired,
  setDemoExpiryHandler,
  setDemoSession,
} from '@/lib/demo-session'
import { getLocale } from '@/paraglide/runtime'
import { ApiError } from './errors'
import type { components, paths } from './schema'

export type Schemas = components['schemas']

type AccessTokenGetter = () => Promise<string | undefined>

let getAccessToken: AccessTokenGetter | null = null

/**
 * Registered by useApiAuthBridge once the user is signed in; cleared on logout.
 * Kept outside React so loaders and the fetch middleware can use it.
 */
export function setAccessTokenGetter(getter: AccessTokenGetter | null): void {
  getAccessToken = getter
}

export function canCallProtectedApi(): boolean {
  return getAccessToken !== null || getDemoToken() !== undefined
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    // The demo session (lib/demo-session.ts) is the second token source next to Auth0's.
    let demoToken = getDemoToken()
    // The access token ran out between two requests: get a new one from the invitation first.
    if (!demoToken && getDemoInvitation()) {
      await renewDemoSession()
      demoToken = getDemoToken()
    }
    if (demoToken) {
      request.headers.set('Authorization', `Bearer ${demoToken}`)
      return request
    }
    if (!getAccessToken) return request
    try {
      const token = await getAccessToken()
      if (token) request.headers.set('Authorization', `Bearer ${token}`)
    } catch (error) {
      // Expired session: send the request anonymously and let the API answer 401.
      console.warn('Could not get an access token', error)
    }
    return request
  },
}

/** Tells the backend (and the interview agent) which language to answer in. */
const languageMiddleware: Middleware = {
  onRequest({ request }) {
    request.headers.set('Accept-Language', getLocale())
    return request
  },
}

/** Turns every non-2xx answer into an ApiError, so error handling reads the status. */
const errorMiddleware: Middleware = {
  async onResponse({ response }) {
    if (response.ok) return undefined
    const body: unknown = await response
      .clone()
      .json()
      .catch(() => undefined)
    const detail =
      typeof body === 'object' && body !== null && 'detail' in body ? body.detail : undefined
    throw new ApiError(response.status, detail)
  },
}

const bearer = (token: string) => `Bearer ${token}`

/**
 * The demo session's safety net, registered last so its onResponse runs first (openapi-fetch runs
 * them in reverse): a 401 for a request that carried the demo token means the token ran out
 * early. Renew from the invitation and send the request once more; with nothing to renew from the
 * session ends. A 401 for a token that is no longer the current one (a slow request that left
 * before a renewal) never ends the fresh session: it is retried with the current token.
 */
const demoRetries = new WeakMap<Request, Request>()
const demoMiddleware: Middleware = {
  onRequest({ request }) {
    const current = getDemoToken()
    if (current && request.headers.get('Authorization') === bearer(current)) {
      demoRetries.set(request, request.clone())
    }
    return undefined
  },
  async onResponse({ request, response }) {
    if (response.status !== 401) return undefined
    const original = demoRetries.get(request)
    if (!original) return undefined
    demoRetries.delete(request)
    const used = original.headers.get('Authorization')
    let token = getDemoToken()
    if (!token || used === bearer(token)) {
      if (!(await renewDemoSession())) return undefined
      token = getDemoToken()
    }
    if (!token) return undefined
    const headers = new Headers(original.headers)
    headers.set('Authorization', bearer(token))
    return fetch(new Request(original, { headers }))
  },
}

// Same origin: the paths in schema.d.ts start with /api/v1, and /api/* is proxied
// to the backend by the Worker (deployed) or the Vite dev server (local).
export const fetchClient = createFetchClient<paths>()
fetchClient.use(languageMiddleware)
fetchClient.use(authMiddleware)
fetchClient.use(errorMiddleware)
fetchClient.use(demoMiddleware)

/**
 * A client for pages without any session (the voting page): no Authorization, no demo token, no
 * retry. The caller passes its own token header. `P` is the contract of those routes.
 */
export function createPublicClient<P extends object>() {
  const client = createFetchClient<P>()
  client.use(languageMiddleware)
  client.use(errorMiddleware)
  return client
}

/** For the entry call only: no demo token, no retry, so a bad link never touches a session. */
const bareClient = createFetchClient<paths>()
bareClient.use(languageMiddleware)
bareClient.use(errorMiddleware)

/**
 * POST /auth/demo with the invitation token. A good answer stores the session (and keeps the
 * invitation for the silent renewal); every failure is an ApiError and leaves the session alone.
 */
export async function exchangeDemoInvitation(invitation: string): Promise<void> {
  const { data } = await bareClient.POST('/api/v1/auth/demo', { body: { token: invitation } })
  if (!data) throw new Error('Empty answer from /auth/demo')
  setDemoSession(data.access_token, data.expires_in, invitation)
}

let renewing: Promise<boolean> | null = null

/**
 * A new access token from the stored invitation, shared by every request that needs one.
 * True when the session is usable again. The invitation is refused (404) or missing: the session
 * ends and the UI asks to open the link again. A passing failure (429, network) keeps it for the
 * next request to try.
 */
export function renewDemoSession(): Promise<boolean> {
  renewing ??= (async () => {
    const invitation = getDemoInvitation()
    if (!invitation) {
      markDemoExpired()
      return false
    }
    try {
      await exchangeDemoInvitation(invitation)
      return true
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 401)) {
        markDemoExpired()
      }
      return false
    }
  })().finally(() => {
    renewing = null
  })
  return renewing
}

setDemoExpiryHandler(() => void renewDemoSession())

/** Type-safe TanStack Query bindings for every endpoint in schema.d.ts. */
export const $api = createClient(fetchClient)
