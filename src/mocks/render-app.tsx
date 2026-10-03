import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, render } from '@testing-library/react'
import { afterEach } from 'vitest'
import { queryClient } from '@/lib/query-client'
import { routeTree } from '@/routeTree.gen'

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
