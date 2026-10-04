// The entry point of `pnpm dev:mock`. Imported only by src/main.tsx, behind
// `__API_MOCK__` (vite.config.ts), so a production build contains neither
// MSW nor this fake session (scripts/check-arch.mjs and scripts/dist.test.mjs guard that).
import {
  Auth0Context,
  type Auth0ContextInterface,
  initialContext,
  type User,
} from '@auth0/auth0-react'
import { setupWorker } from 'msw/browser'
import type { ReactNode } from 'react'
import { setAuthConfig } from '@/lib/env'
import { MOCK_USER_NAME, MOCK_USER_SUB } from './fixtures'
import { createHandlers } from './handlers'
import { pickScenario, type ScenarioName } from './scenarios'

const STORAGE_KEY = 'tuttitrip-mock-scenario'

export async function startMockApi(): Promise<ScenarioName> {
  let stored: string | null = null
  try {
    stored = sessionStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage blocked: the scenario then only lives as long as the URL says.
  }
  const scenario = pickScenario(window.location.search, stored)
  try {
    sessionStorage.setItem(STORAGE_KEY, scenario)
  } catch {
    // Same as above.
  }

  // A service worker left by the PWA (same scope) would answer before MSW does.
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(
    registrations
      .filter((registration) => !registration.active?.scriptURL.endsWith('/mockServiceWorker.js'))
      .map((registration) => registration.unregister()),
  )

  // The session flags: "Auth0 is configured", so the app asks the (fake) session below.
  setAuthConfig({ domain: 'mock.invalid', clientId: 'mock', audience: undefined })

  const worker = setupWorker(...createHandlers(scenario, { delayMs: 250 }))
  await worker.start({ quiet: true, onUnhandledFrame: 'bypass' })
  // biome-ignore lint/suspicious/noConsole: tells the developer which scenario is active
  console.info(`[mock API] scenario "${scenario}" (change it with ?scenario=<name>)`)
  return scenario
}

const user: User = { sub: MOCK_USER_SUB, name: MOCK_USER_NAME, email: 'ola.testowa@example.com' }

const signedIn: Auth0ContextInterface = {
  ...initialContext,
  isAuthenticated: true,
  isLoading: false,
  user,
  error: undefined,
  getAccessTokenSilently: (async () => 'mock-access-token') as never,
  loginWithRedirect: async () => undefined,
  logout: async () => undefined,
}

/** A signed-in test user without Auth0 and without a network. Replaces <Auth0Provider>. */
export function MockAuthProvider({ children }: { children: ReactNode }) {
  return <Auth0Context.Provider value={signedIn}>{children}</Auth0Context.Provider>
}
