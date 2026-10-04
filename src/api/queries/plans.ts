import { $api, type Schemas } from '@/api/client'

export type PlanFairness = Schemas['PlanFairness']
export type PersonFairness = Schemas['PersonFairness']
export type PlanDomainCode = Schemas['PlanDomainCode']
export type PlanDomainScore = Schemas['PlanDomainScore']
export type FloorMiss = Schemas['FloorMiss']
export type PlanConflict = Schemas['PlanConflict']
export type PlanCreate = Schemas['PlanCreate']
export type WeightPreset = Schemas['WeightPreset']

/** Why one person pays what they pay: which discount the price carries. */
export type PriceDiscount = 'none' | 'child' | 'senior' | 'student' | 'free' | 'family'

/**
 * One person's entry price at a stop, with the discount.
 * Contract of backend#54 (entry prices with discounts), which is not in the OpenAPI schema yet:
 * until it ships the API leaves `price_lines` out and the UI falls back to `cost_per_person`.
 */
export interface PriceLine {
  profile_id: string
  /** Money as a decimal string, after the unverified-price surcharge. */
  price: string
  discount: PriceDiscount
}

/** A family ticket cheaper than the single tickets of the group (backend#54). */
export interface FamilyTicket {
  /** The whole group's price with the family ticket. */
  total: string
  /** What the same group pays with single tickets. */
  singles_total: string
}

/** A public transport ticket for one day; information only, never part of the budget (E6). */
export interface TransitTicket {
  day: number
  ticket: 'single' | 'day' | 'h72' | 'week' | 'family'
  cost: string
  verified: boolean
  source_url?: string | null
}

export type PlanStop = Schemas['PlanStop']
export type PlanDay = Omit<Schemas['PlanDay'], 'items'> & { items: PlanStop[] }
export type Plan = Omit<Schemas['PlanRead'], 'days'> & {
  days: PlanDay[]
  transit_tickets?: TransitTicket[]
}

/** The current version of a trip's plan. The API answers 404 while there is none. */
export const planQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/plans/latest', {
    params: { path: { trip_id: tripId } },
  })

/** The plan that was on screen when a recalculation started, to show what the recalculation changed. */
export const planBeforeQueryKey = (tripId: string) => ['plan-before', tripId] as const
