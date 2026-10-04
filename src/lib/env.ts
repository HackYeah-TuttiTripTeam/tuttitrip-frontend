import { MS_PER_HOUR, MS_PER_MINUTE } from './constants'

const read = (value: string | undefined) => value?.trim() || undefined

/** A positive number of milliseconds from an env var, or the default when it is missing or bad. */
function readMs(value: string | undefined, fallback: number): number {
  const parsed = Number(read(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** True in `vite dev`; setup hints for developers are shown only then. */
export const isDev = import.meta.env.DEV

/** How long fetched data counts as fresh, in ms (`VITE_QUERY_STALE_MS`, default one minute). */
export const queryStaleMs = readMs(import.meta.env.VITE_QUERY_STALE_MS, MS_PER_MINUTE)

/** How often an open tab asks for a new service worker, in ms (`VITE_PWA_UPDATE_CHECK_MS`, default one hour). */
export const pwaUpdateCheckMs = readMs(import.meta.env.VITE_PWA_UPDATE_CHECK_MS, MS_PER_HOUR)

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
export let authConfig: AuthConfig | null = readAuthConfig()

/** For `pnpm dev:mock` only: the mock entry says "a session exists" before the app renders. */
export function setAuthConfig(config: AuthConfig | null): void {
  authConfig = config
}
