import type { Schemas } from '@/api/client'
import { ApiError } from '@/api/errors'
import type { InterviewCard } from '@/lib/interview'
import { m } from '@/paraglide/messages'

export type MissingInput = Schemas['MissingInput']

/** Why "Policz plan" failed, as far as the UI has a different thing to say or do. */
export type PlanFailure =
  | 'missing'
  | 'catalog_missing'
  | 'forbidden'
  | 'offline'
  | 'server'
  | 'unknown'

/** `detail.code` of the 422 and 409 the plan endpoint answers with (`PlanErrorCode` in the backend). */
const CODE_MISSING_INPUTS = 'plan.missing_inputs'
/** Any city is a destination: one the catalog lacks is fetched, not asked for again. */
const CODE_CATALOG_MISSING = 'catalog_missing'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isMissingInput = (value: unknown): value is MissingInput =>
  isRecord(value) && typeof value.field === 'string' && typeof value.kind === 'string'

export interface PlanFailureInfo {
  kind: PlanFailure
  /** What to ask, in order; empty unless the failure is `missing`. */
  missing: MissingInput[]
}

/** Reads the answer of the plan endpoint; the 422 and 409 of the contract carry a `code`. */
export function classifyPlanFailure(error: unknown): PlanFailureInfo | null {
  if (error === null || error === undefined) return null
  if (error instanceof TypeError) return { kind: 'offline', missing: [] }
  if (!(error instanceof ApiError)) return { kind: 'unknown', missing: [] }
  const detail = isRecord(error.detail) ? error.detail : null
  if (error.status === 422 && detail?.code === CODE_MISSING_INPUTS) {
    const missing = Array.isArray(detail.missing) ? detail.missing.filter(isMissingInput) : []
    return { kind: missing.length > 0 ? 'missing' : 'unknown', missing }
  }
  if (error.status === 409 && detail?.code === CODE_CATALOG_MISSING) {
    return { kind: 'catalog_missing', missing: [] }
  }
  if (error.status === 403) return { kind: 'forbidden', missing: [] }
  if (error.status >= 500) return { kind: 'server', missing: [] }
  return { kind: 'unknown', missing: [] }
}

export const PLAN_FAILURE_TEXT: Record<PlanFailure, () => string> = {
  missing: m.plan_compute_missing,
  catalog_missing: m.plan_compute_catalog_missing,
  forbidden: m.plan_compute_forbidden,
  offline: m.plan_compute_offline,
  server: m.plan_compute_server,
  unknown: m.plan_compute_failed,
}

const QUESTION: Record<MissingInput['field'], () => string> = {
  destination: m.plan_missing_q_destination,
  dates: m.plan_missing_q_dates,
  people: m.plan_missing_q_people,
}

/** The interview card that asks for a missing input: the same component, the same props. */
export function missingCard(input: MissingInput): InterviewCard {
  return {
    kind: input.kind,
    question: QUESTION[input.field](),
    options: input.options ?? [],
    field: input.field,
    personId: input.person_id ?? undefined,
  }
}
