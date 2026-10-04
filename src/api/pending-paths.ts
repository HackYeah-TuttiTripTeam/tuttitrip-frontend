import type { components } from './schema'

/**
 * Endpoints of backend issues that are not in `schema.d.ts` yet, typed from the contract written
 * in the issue or the backend PR: the linter of a trip's plan and of pasted plans and the places of a
 * new city (backend PR #201), the "rain" replan and its approvals (#74, PR #208). `ApiPaths` (client.ts) adds them to the
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

type PlanStop = components['schemas']['PlanStop']
type LintReport = components['schemas']['LintReport']
type JobAccepted = components['schemas']['JobAccepted']

export interface PendingSchemas {
  /** PR #201, linter: a plan pasted from a chatbot, read by a worker, then linted. */
  PasteCreate: { text: string; provider: 'openrouter' | 'local' }
  PasteAccepted: { workflow_id: string; paste_id: string }
  MatchCandidate: {
    place_id: string
    name: string
    address?: string | null
    category?: string | null
    score: number
  }
  PasteItemRead: {
    index: number
    /** Day number in the text; null when absent. */
    day: number | null
    place_name: string
    quote: string
    /** Anything but `matched` counts as an unknown place in the report. */
    status: 'matched' | 'needs_confirmation' | 'unrecognized'
    place_id: string | null
    suggested_place_id?: string | null
    chosen_by_host?: boolean
    candidates?: PendingSchemas['MatchCandidate'][]
  }
  PasteCheckRead: {
    paste_id: string
    trip_id: string
    state: 'pending' | 'done' | 'failed'
    job_id: string
    error_code?: string | null
    violations: number | null
    report: LintReport | null
    items?: PendingSchemas['PasteItemRead'][]
    unread?: { quote: string; reason: string }[]
  }
  ItemPick: { place_id: string }

  /** PR #201, places of a new city. */
  CandidatesRequest: { city_query?: string | null }
  CandidatesStatus: {
    city_slug: string
    place_count: number
    /** `empty`: no places and no job. */
    state: 'ready' | 'running' | 'failed' | 'empty'
    job_id?: string | null
    error_code?: string | null
    error?: string | null
  }
  /** The 409 plan generation answers for a city with no places; `job_id` null: no worker took it. */
  PlanCatalogMissing: {
    code: 'catalog_missing'
    message: string
    city_slug: string
    job_id?: string | null
  }

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
    post: {
      parameters: { query?: never; header?: never; path: TripPath & { plan_id: string }; cookie?: never }
      requestBody?: never
      responses: Answers<{ 200: LintReport }>
    }
  }
  '/api/v1/trips/{trip_id}/linter/pastes': {
    post: WriteOp<TripPath, S['PasteCreate'], { 202: S['PasteAccepted'] }>
  }
  '/api/v1/trips/{trip_id}/linter/pastes/{paste_id}': {
    get: ReadOp<TripPath & { paste_id: string }, { 200: S['PasteCheckRead'] }>
  }
  '/api/v1/trips/{trip_id}/linter/pastes/{paste_id}/items/{index}': {
    patch: WriteOp<
      TripPath & { paste_id: string; index: number },
      S['ItemPick'],
      { 200: S['PasteCheckRead'] }
    >
  }
  '/api/v1/trips/{trip_id}/places/candidates': {
    post: WriteOp<
      TripPath,
      S['CandidatesRequest'] | null,
      { 200: S['CandidatesStatus']; 202: JobAccepted | S['CandidatesStatus'] }
    >
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
