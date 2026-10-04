import { canCallProtectedApi } from '@/api/client'
import {
  parametersQueryOptions,
  type VersionsParams,
  versionsQueryOptions,
} from '@/api/queries/planning-parameters'
import { createListSearchSchema } from './list-search'
import type { RouterContext } from './router-context'

/** The history is newest first; the API sorts by version, so only the direction is chosen. */
const list = createListSearchSchema({
  sortKeys: ['version'],
  defaultSort: 'version',
  defaultDir: 'desc',
  filters: {},
})

export const planningSearchSchema = list.schema
export const planningSearchDefaults = list.defaults
export type PlanningSearch = typeof planningSearchDefaults

/** Starts fetching the parameters and their history before the view renders. */
export function loadPlanning({ context, deps }: { context: RouterContext; deps: VersionsParams }) {
  if (!canCallProtectedApi()) return
  void context.queryClient.prefetchQuery(parametersQueryOptions())
  return context.queryClient.prefetchQuery(versionsQueryOptions(deps))
}
