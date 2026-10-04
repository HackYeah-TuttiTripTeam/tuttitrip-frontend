import { createApiClient } from '@/api/client'

/**
 * The budget approvals of backend#77 are not in the generated schema yet (the endpoints are not
 * merged). This is their contract as the issue describes it; when `pnpm api:sync` brings them in,
 * delete this file's local types and use `fetchClient` / `$api` like the rest.
 */
export type BudgetApprovalStatus = 'pending' | 'approved' | 'rejected' | 'superseded'

interface BudgetApproval {
  id: string
  status: BudgetApprovalStatus
}

interface ApprovalPaths {
  '/api/v1/trips/{trip_id}/budget-approvals': {
    get: {
      parameters: { path: { trip_id: string } }
      responses: { 200: { content: { 'application/json': BudgetApproval[] } } }
    }
  }
  '/api/v1/trips/{trip_id}/budget-approvals/{approval_id}/approve': {
    post: {
      parameters: { path: { trip_id: string; approval_id: string } }
      responses: { 200: { content: { 'application/json': BudgetApproval } } }
    }
  }
  '/api/v1/trips/{trip_id}/budget-approvals/{approval_id}/reject': {
    post: {
      parameters: { path: { trip_id: string; approval_id: string } }
      responses: { 200: { content: { 'application/json': BudgetApproval } } }
    }
  }
}

const approvalsClient = createApiClient<ApprovalPaths>()

export type ApprovalDecision = 'approve' | 'reject'

/** Finds the pending approval of the trip and approves or rejects it. */
export async function decideBudgetApproval(tripId: string, decision: ApprovalDecision) {
  const { data: list } = await approvalsClient.GET('/api/v1/trips/{trip_id}/budget-approvals', {
    params: { path: { trip_id: tripId } },
  })
  const pending = list?.find((approval) => approval.status === 'pending')
  if (!pending) throw new Error('No pending budget approval')
  const path =
    decision === 'approve'
      ? '/api/v1/trips/{trip_id}/budget-approvals/{approval_id}/approve'
      : '/api/v1/trips/{trip_id}/budget-approvals/{approval_id}/reject'
  const { data } = await approvalsClient.POST(path, {
    params: { path: { trip_id: tripId, approval_id: pending.id } },
  })
  return data
}
