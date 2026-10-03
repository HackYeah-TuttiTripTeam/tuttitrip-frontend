import { createRouter } from '@tanstack/react-router'
import { applyLangParam } from '@/lib/lang-param'
import { queryClient } from '@/lib/query-client'
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
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
