import { $api, type Schemas } from '@/api/client'
import { type Page, pagedQueryOptions } from './paged'

export type Decision = Schemas['DecisionRead']
export type DecisionKind = Schemas['DecisionKind']
export type DecisionEffects = Schemas['DecisionEffects']
export type DecisionSort = Schemas['DecisionSort']
export type OverrideKind = Schemas['OverrideKind']
export type OverrideCreate = Schemas['OverrideCreate']
export type OverridePreview = Schemas['OverridePreview']
export type OverrideConflict = Schemas['OverrideConflict']
export type PlanConflict = Schemas['PlanConflict']
export type DecisionsPage = Page<Decision>

/** Prefix of every cached page of the log, for invalidation after a decision. */
export const decisionsKey = ['get', '/api/v1/trips/{trip_id}/decisions'] as const

/** What the log view sends: the validated URL search (see loaders/trip.ts). */
export interface DecisionsSearch {
  page: number
  size: number
  sort: DecisionSort
  dir: Schemas['SortDir']
  kind?: DecisionKind | undefined
}

export const decisionsQueryOptions = (tripId: string, search: DecisionsSearch) =>
  pagedQueryOptions(
    $api.queryOptions('get', '/api/v1/trips/{trip_id}/decisions', {
      params: { path: { trip_id: tripId }, query: search },
    }),
  )
