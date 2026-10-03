import createFetchClient, { type Middleware } from 'openapi-fetch'
import createClient from 'openapi-react-query'
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
  return getAccessToken !== null
}

/**
 * Fresh access token for non-fetch clients (the AG-UI agent). Auth0 refreshes it
 * silently when it is about to expire; throws when the session is gone.
 * Spike fallback: a token pasted into sessionStorage ("spike-token") for smoke tests.
 */
export async function currentAccessToken(): Promise<string | undefined> {
  if (getAccessToken) return getAccessToken()
  try {
    return sessionStorage.getItem('spike-token') ?? undefined
  } catch {
    return undefined
  }
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
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

// Same origin: the paths in schema.d.ts start with /api/v1, and /api/* is proxied
// to the backend by the Worker (deployed) or the Vite dev server (local).
export const fetchClient = createFetchClient<paths>()
fetchClient.use(authMiddleware)

/** Type-safe TanStack Query bindings for every endpoint in schema.d.ts. */
export const $api = createClient(fetchClient)
