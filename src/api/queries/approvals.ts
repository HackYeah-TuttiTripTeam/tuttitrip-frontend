import { $api, type Schemas } from '@/api/client'

export type BudgetApproval = Schemas['BudgetApprovalRead']
export type BudgetApprovalStatus = Schemas['BudgetApprovalStatus']
export type ApprovalDecision = 'approve' | 'reject'

/** Prefix of every cached list of approvals, for invalidation after a decision. */
export const approvalsKey = ['get', '/api/v1/trips/{trip_id}/budget-approvals'] as const

/** The one approval that waits for the host: the newest `pending` row (at most one exists). */
export const pendingApprovalQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/budget-approvals', {
    params: { path: { trip_id: tripId }, query: { status: 'pending', size: 1 } },
  })
