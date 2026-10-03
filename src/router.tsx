import { createRouter } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { reloadIfStaleChunk } from '@/lib/stale-assets'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // Let TanStack Query decide when data is stale
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  // A lazy route chunk removed by a newer deploy: reload once to get the current build.
  defaultOnCatch: (error) => void reloadIfStaleChunk(error),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
