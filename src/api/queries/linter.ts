import { $api, type Schemas } from '@/api/client'
import type { PendingSchemas } from '@/api/pending-paths'

export type LintReport = Schemas['LintReport']
export type LintRuleResult = Schemas['RuleResult']
export type LintFinding = Schemas['Finding']
export type PasteReport = PendingSchemas['PasteReport']
export type PasteUnrecognized = PendingSchemas['PasteUnrecognized']

/** The API refuses a longer text (`MAX_DOCUMENT_CHARS` of the linter's documents). */
export const PASTE_MAX_CHARS = 20_000

/** The linter on a version of the trip's own plan: synchronous, a POST without a body. */
export const planLintQueryOptions = (tripId: string, planId: string) =>
  $api.queryOptions('post', '/api/v1/trips/{trip_id}/linter/plans/{plan_id}', {
    params: { path: { trip_id: tripId, plan_id: planId } },
    body: {},
  })

export const pasteQueryOptions = (tripId: string, pasteId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/linter/pastes/{paste_id}', {
    params: { path: { trip_id: tripId, paste_id: pasteId } },
  })
