import { z } from 'zod'
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

/** The part of the 409 body (`OverrideConflict`) the screen reads: the reason code of each conflict. */
const conflictBody = z.object({ conflicts: z.array(z.object({ reason_code: z.string() })) })

/** The reasons of a 409 on an override ("must" runs into a veto or another hard rule), in words. */
export function conflictMessages(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.status !== 409) return []
  const parsed = conflictBody.safeParse(error.body)
  const codes = parsed.success ? [...new Set(parsed.data.conflicts.map((c) => c.reason_code))] : []
  return codes.length > 0 ? codes.map(conflictLabel) : [m.override_conflict_generic()]
}
