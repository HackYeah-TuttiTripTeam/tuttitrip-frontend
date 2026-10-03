const read = (value: string | undefined) => value?.trim() || undefined

const LOCAL_API_URL = 'http://localhost:8000'

/** Base URL of the TuttiTrip API, without a trailing slash. */
export const apiUrl = (read(import.meta.env.VITE_API_URL) ?? LOCAL_API_URL).replace(/\/+$/, '')

/** Deployment name shown in the UI: main, develop, a branch slug or local. */
export const appEnv = read(import.meta.env.VITE_APP_ENV) ?? 'local'

export interface AuthConfig {
  domain: string
  clientId: string
  audience: string | undefined
}

function readAuthConfig(): AuthConfig | null {
  const domain = read(import.meta.env.VITE_AUTH0_DOMAIN)
  const clientId = read(import.meta.env.VITE_AUTH0_CLIENT_ID)
  if (!domain || !clientId) return null
  return { domain, clientId, audience: read(import.meta.env.VITE_AUTH0_AUDIENCE) }
}

/** Auth0 settings, or null when VITE_AUTH0_DOMAIN / VITE_AUTH0_CLIENT_ID are missing. */
export const authConfig = readAuthConfig()
