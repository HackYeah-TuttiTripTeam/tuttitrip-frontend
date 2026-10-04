import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { loadPlanning, planningSearchDefaults, planningSearchSchema } from '@/loaders/planning'
import { PlanningView } from '@/views/planning-view'

export const Route = createFileRoute('/admin/planning')({
  validateSearch: planningSearchSchema,
  search: { middlewares: [stripSearchParams(planningSearchDefaults)] },
  loaderDeps: ({ search }) => ({ page: search.page, size: search.size, dir: search.dir }),
  loader: loadPlanning,
  component: PlanningView,
})
