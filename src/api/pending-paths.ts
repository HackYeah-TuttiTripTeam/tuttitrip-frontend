import type { components } from './schema'

/**
 * Endpoints of backend issues that are not in `schema.d.ts` yet, typed from the contract written
 * in the issue: linter for a trip's plan and pasted plans (backend #66), fetching places for a new
 * city (#72), the "rain" replan and its approvals (#74). `ApiPaths` (client.ts) adds them to the
 * generated paths, so the calls are as type-safe as the rest. When a backend PR lands, run
 * `pnpm api:sync`, delete that block here and fix what tsc points at: the real shapes win.
 */

type Json<T> = { headers: { [name: string]: unknown }; content: { 'application/json': T } }
type Answers<R extends Record<number, unknown>> = { [S in keyof R]: Json<R[S]> }

interface ReadOp<P, R extends Record<number, unknown>> {
  parameters: {
    query?: Record<string, string | number | undefined>
    header?: never
    path: P
    cookie?: never
  }
  requestBody?: never
  responses: Answers<R>
}

interface WriteOp<P, B, R extends Record<number, unknown>> {
  parameters: { query?: never; header?: never; path: P; cookie?: never }
  requestBody: { content: { 'application/json': B } }
  responses: Answers<R>
}

type LintReport = components['schemas']['LintReport']
type PlanStop = components['schemas']['PlanStop']

export interface PendingSchemas {
  /** #66: the pasted text is saved and a worker reads it. */
  PasteCreate: { text: string }
  PasteAccepted: { workflow_id: string; paste_id: string }
  PasteCandidate: {
    place_id: string
    name: string
    address?: string | null
    category?: string | null
    score: number
  }
  /** A pasted item the matcher could not place; the host picks one of the candidates. */
  PasteUnrecognized: {
    index: number
    name: string
    day: string | null
    candidates: PendingSchemas['PasteCandidate'][]
  }
  PasteReport: {
    status: 'pending' | 'ready' | 'failed'
    /** Null until the job is done. */
    report: LintReport | null
    unrecognized: PendingSchemas['PasteUnrecognized'][]
    error_code?: string | null
  }
  PasteItemChoice: { place_id: string }

  /** #72 */
  CandidatesStatus: {
    status: 'idle' | 'pending' | 'ready' | 'failed'
    workflow_id?: string | null
    city_slug: string
    city_name?: string | null
    /** Places in the city's catalogue now. */
    places_count: number
    error_code?: string | null
  }
  /** The body of the 409 that plan generation answers for a city with an empty catalogue. */
  CatalogMissing: {
    code: 'catalog_missing'
    workflow_id: string
    city_slug: string
    city_name?: string | null
  }
  JobStarted: { workflow_id: string }

  /** #74 */
  ReplanRequest: { context: 'rain'; day: number; as_of?: string | null }
  ReplanChange: {
    kind: 'replaced' | 'moved' | 'removed' | 'added'
    name: string
    /** The place it replaces, for `replaced`. */
    was_name?: string | null
    start?: string | null
    was_start?: string | null
    shift_minutes: number
    person_ids: string[]
    person_names: string[]
  }
  Replan: {
    id: string
    plan_id: string
    day: number
    context: 'rain'
    /** `active`: applied. `pending_host`: a member's change that touches others waits for the host. */
    status: 'active' | 'pending_host' | 'rejected'
    changes: PendingSchemas['ReplanChange'][]
    /** The rest of the day after the change. */
    items: PlanStop[]
    /** Cost of the changes (J_replan): fewer changes and smaller shifts cost less. */
    cost: number
    requested_by_name?: string | null
    created_at: string
  }
  ReplanList: { items: PendingSchemas['Replan'][]; total: number }
}

type S = PendingSchemas
type TripPath = { trip_id: string }

export interface PendingPaths {
  '/api/v1/trips/{trip_id}/linter/plans/{plan_id}': {
    post: WriteOp<TripPath & { plan_id: string }, Record<string, never>, { 200: LintReport }>
  }
  '/api/v1/trips/{trip_id}/linter/pastes': {
    post: WriteOp<TripPath, S['PasteCreate'], { 202: S['PasteAccepted'] }>
  }
  '/api/v1/trips/{trip_id}/linter/pastes/{paste_id}': {
    get: ReadOp<TripPath & { paste_id: string }, { 200: S['PasteReport'] }>
  }
  '/api/v1/trips/{trip_id}/linter/pastes/{paste_id}/items/{index}': {
    patch: WriteOp<
      TripPath & { paste_id: string; index: number },
      S['PasteItemChoice'],
      { 200: S['PasteReport'] }
    >
  }
  '/api/v1/trips/{trip_id}/places/candidates': {
    post: WriteOp<TripPath, Record<string, never>, { 202: S['JobStarted'] }>
  }
  '/api/v1/trips/{trip_id}/places/candidates/status': {
    get: ReadOp<TripPath, { 200: S['CandidatesStatus'] }>
  }
  '/api/v1/trips/{trip_id}/plans/{plan_id}/replan': {
    post: WriteOp<TripPath & { plan_id: string }, S['ReplanRequest'], { 200: S['Replan'] }>
  }
  '/api/v1/trips/{trip_id}/replans': {
    get: ReadOp<TripPath, { 200: S['ReplanList'] }>
  }
  '/api/v1/trips/{trip_id}/replans/{replan_id}/approve': {
    post: WriteOp<TripPath & { replan_id: string }, Record<string, never>, { 200: S['Replan'] }>
  }
  '/api/v1/trips/{trip_id}/replans/{replan_id}/reject': {
    post: WriteOp<TripPath & { replan_id: string }, Record<string, never>, { 200: S['Replan'] }>
  }
}
