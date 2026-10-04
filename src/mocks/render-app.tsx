import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'
import { queryClient } from '@/lib/query-client'
import { overwriteGetLocale } from '@/paraglide/runtime'
import { routeTree } from '@/routeTree.gen'
import { TRIP_ID } from './fixtures'
import { createHandlers } from './handlers'
import { server } from './node'
import { defaultScenario } from './scenarios'

// Failures show at once instead of after the retries of the production client.
queryClient.setDefaultOptions({ queries: { retry: false } })

afterEach(() => {
  cleanup()
  queryClient.clear()
})

/** Renders the whole app (real router, real API client) at a URL; the API is the current scenario. */
export function renderApp(url: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [url] }),
    context: { queryClient },
  })
  return {
    router,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  }
}

/**
 * Renders the trips list once and throws it away. The first render in a fresh worker pays a one-off
 * cold start (first route match, jsdom layout, MSW round trip); under parallel load it can exceed
 * the 1 s default of findBy*, and it always hit the first test of a file. Every test file that
 * imports this module pays it here, in a hook with a limit meant for it, so every test keeps the
 * strict default.
 */
async function warmUpApp(): Promise<void> {
  // beforeAll runs before the per-test defaults of vitest-setup.ts.
  overwriteGetLocale(() => 'pl')
  server.use(...createHandlers(defaultScenario))
  try {
    renderApp('/trips')
    await screen.findByRole('link', { name: /Warszawa z rodziną/ }, { timeout: 45_000 })
    cleanup()
    // The trip page is the heaviest screen (tabs, lists, forms); its first render is the slowest.
    renderApp(`/trips/${TRIP_ID}?tab=people`)
    await screen.findByRole('tab', { name: /./ }, { timeout: 45_000 })
  } catch {
    // Best effort: a file that mocks the session (join-view) may not show the list. The modules
    // are loaded by then, which is most of the cold start.
  } finally {
    cleanup()
    queryClient.clear()
  }
}

beforeAll(warmUpApp, 60_000)
