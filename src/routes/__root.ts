import { createRootRouteWithContext } from '@tanstack/react-router'
import type { RouterContext } from '@/loaders/router-context'
import { NotFoundView } from '@/views/not-found-view'
import { RootLayoutView } from '@/views/root-layout-view'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayoutView,
  notFoundComponent: NotFoundView,
})
