import { $api, type Schemas } from '@/api/client'

export type Plan = Schemas['PlanRead']
export type PlanDay = Schemas['PlanDay']
export type PlanStop = Schemas['PlanStop']
export type PlanBudget = Schemas['PlanBudget']
export type PlanVerdict = Schemas['PlanVerdict']
export type VerdictKind = Schemas['VerdictKind']
export type ExplainEntry = Schemas['ExplainEntry']
export type ReasonCode = Schemas['ReasonCode']
export type PlanFairness = Schemas['PlanFairness']

/** The current version of a trip's plan. The API answers 404 while there is none. */
export const planQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/plans/latest', {
    params: { path: { trip_id: tripId } },
  })
