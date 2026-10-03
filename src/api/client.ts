import createFetchClient, { type Middleware } from 'openapi-fetch'
import createClient from 'openapi-react-query'
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
  return getAccessToken !== null
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

// Same origin: the paths in schema.d.ts start with /api/v1, and /api/* is proxied
// to the backend by the Worker (deployed) or the Vite dev server (local).
export const fetchClient = createFetchClient<paths>()
fetchClient.use(languageMiddleware)
fetchClient.use(authMiddleware)
fetchClient.use(errorMiddleware)

/** Type-safe TanStack Query bindings for every endpoint in schema.d.ts. */
export const $api = createClient(fetchClient)
