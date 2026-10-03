import { $api, type Schemas } from '@/api/client'

export type Plan = Schemas['PlanRead']
export type PlanDay = Schemas['PlanDay']
export type PlanStop = Schemas['PlanStop']

/** The current version of a trip's plan. The API answers 404 while there is none. */
export const planQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/plans/latest', {
    params: { path: { trip_id: tripId } },
  })
