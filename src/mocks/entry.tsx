// The entry point of `pnpm dev:mock`. Imported only by src/main.tsx, behind
// `import.meta.env.DEV && VITE_API_MOCK === '1'`, so a production build contains neither
// MSW nor this fake session (scripts/check-arch.mjs and scripts/dist.test.mjs guard that).
import {
  Auth0Context,
  type Auth0ContextInterface,
  initialContext,
  type User,
} from '@auth0/auth0-react'
import { setupWorker } from 'msw/browser'
import type { ReactNode } from 'react'
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
