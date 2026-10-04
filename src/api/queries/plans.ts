import { $api, type Schemas } from '@/api/client'

export type PlanFairness = Schemas['PlanFairness']
export type PersonFairness = Schemas['PersonFairness']
export type PlanDomainCode = Schemas['PlanDomainCode']
export type PlanDomainScore = Schemas['PlanDomainScore']
export type FloorMiss = Schemas['FloorMiss']
export type PlanConflict = Schemas['PlanConflict']
export type PlanBudget = Schemas['PlanBudget']
export type PlanVerdict = Schemas['PlanVerdict']
export type VerdictKind = Schemas['VerdictKind']
export type ExplainEntry = Schemas['ExplainEntry']
export type ReasonCode = Schemas['ReasonCode']
export type PlanCreate = Schemas['PlanCreate']
export type WeightPreset = Schemas['WeightPreset']

export type PriceLine = Schemas['PriceLine']
export type PriceDiscount = PriceLine['discount']
export type FamilyTicket = Schemas['FamilyTicket']
export type TransitTicket = Schemas['TransitTicket']
export type PlanStop = Schemas['PlanStop']
export type PlanDay = Schemas['PlanDay']
export type Plan = Schemas['PlanRead']

/** The current version of a trip's plan. The API answers 404 while there is none. */
export const planQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/plans/latest', {
    params: { path: { trip_id: tripId } },
  })

/** The plan that was on screen when a recalculation started, to show what the recalculation changed. */
export const planBeforeQueryKey = (tripId: string) => ['plan-before', tripId] as const
