import { createRouter } from '@tanstack/react-router'
import { applyLangParam } from '@/lib/lang-param'
import { queryClient } from '@/lib/query-client'
import { routeErrorHandler } from '@/lib/stale-assets'
import { routeTree } from './routeTree.gen'

// A link with ?lang=en (hreflang, share URLs) sets the language before the router reads the URL.
applyLangParam()

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // Let TanStack Query decide when data is stale
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  // A lazy route chunk removed by a newer deploy: reload once to get the current build.
  defaultOnCatch: routeErrorHandler(),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
