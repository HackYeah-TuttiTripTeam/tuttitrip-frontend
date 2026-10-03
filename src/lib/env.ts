const read = (value: string | undefined) => value?.trim() || undefined

/** True in `vite dev`; setup hints for developers are shown only then. */
export const isDev = import.meta.env.DEV

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
