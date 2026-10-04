import { $api, type Schemas } from '@/api/client'
import { PLAN_PROGRESS_POLL_MS } from '@/lib/plan-progress'

export type PlanProgress = Schemas['PlanProgressRead']

/** The stage of the plan being computed for the trip; `null` when nothing is running. */
export const planProgressQueryOptions = (tripId: string, active: boolean) =>
  $api.queryOptions(
    'get',
    '/api/v1/trips/{trip_id}/plans/progress',
    { params: { path: { trip_id: tripId } } },
    {
      enabled: active,
      refetchInterval: active ? PLAN_PROGRESS_POLL_MS : false,
      // A stage of an earlier run must never show at the start of the next one.
      gcTime: 0,
      staleTime: 0,
      retry: false,
    },
  )
