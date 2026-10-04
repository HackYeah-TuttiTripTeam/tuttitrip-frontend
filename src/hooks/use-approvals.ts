import { useQuery, useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { ApiError } from '@/api/errors'
import { approvalsKey, pendingApprovalQueryOptions } from '@/api/queries/approvals'
import { decisionsKey } from '@/api/queries/decisions'
import { planQueryOptions } from '@/api/queries/plans'

/**
 * The host's answer to a budget overrun. The window decides about the approval it was opened for
 * (`approval`), not about whichever is first in a list. Approving keeps the plan over `B_do`,
 * rejecting makes the plan within it the active one; both change the latest plan, so it, the
 * approvals and the log are read again. A 409 means somebody decided first or the plan was
 * recomputed (the approval is `superseded`): the same refresh shows the plan as it is now.
 */
export function useBudgetDecision(tripId: string, enabled: boolean) {
  const queryClient = useQueryClient()
  const pending = useQuery({ ...pendingApprovalQueryOptions(tripId), enabled })
  const approval = pending.data?.items[0]

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: planQueryOptions(tripId).queryKey }),
      queryClient.invalidateQueries({ queryKey: approvalsKey }),
      queryClient.invalidateQueries({ queryKey: decisionsKey }),
    ])
  const options = { onSettled: refresh }
  const approve = $api.useMutation(
    'post',
    '/api/v1/trips/{trip_id}/budget-approvals/{approval_id}/approve',
    options,
  )
  const reject = $api.useMutation(
    'post',
    '/api/v1/trips/{trip_id}/budget-approvals/{approval_id}/reject',
    options,
  )

  const decide = (decision: 'approve' | 'reject') => {
    if (!approval) return
    const params = { path: { trip_id: tripId, approval_id: approval.id } }
    const mutation = decision === 'approve' ? approve : reject
    mutation.mutate({ params })
  }
  const error = approve.error ?? reject.error
  return {
    approval,
    decide,
    isPending: approve.isPending || reject.isPending,
    /** Somebody decided first, or the plan changed under the window. */
    changed: error instanceof ApiError && error.status === 409,
    forbidden: error instanceof ApiError && error.status === 403,
    failed: error !== null,
    reset: () => {
      approve.reset()
      reject.reset()
    },
  }
}
