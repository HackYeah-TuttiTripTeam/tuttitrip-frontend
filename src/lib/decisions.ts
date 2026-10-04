import { ApiError } from '@/api/errors'
import type { DecisionKind } from '@/api/queries/decisions'
import { m } from '@/paraglide/messages'
import { conflictLabel } from './verdicts'

/** The kinds of log entry, in the order of the filter. */
export const DECISION_KINDS = [
  'must',
  'block',
  'revoke',
  'budget_approval',
] as const satisfies readonly DecisionKind[]

/** The reasons of a 409 on an override ("must" runs into a veto or another hard rule), in words. */
export function conflictMessages(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.status !== 409) return []
  const body = error.body
  const conflicts =
    typeof body === 'object' &&
    body !== null &&
    'conflicts' in body &&
    Array.isArray(body.conflicts)
      ? (body.conflicts as unknown[])
      : []
  const codes = conflicts.flatMap((conflict) =>
    typeof conflict === 'object' &&
    conflict !== null &&
    'reason_code' in conflict &&
    typeof conflict.reason_code === 'string'
      ? [conflict.reason_code]
      : [],
  )
  return codes.length > 0 ? [...new Set(codes)].map(conflictLabel) : [m.override_conflict_generic()]
}
