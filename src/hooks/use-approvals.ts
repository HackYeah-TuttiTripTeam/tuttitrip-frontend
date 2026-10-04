import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ApprovalDecision, decideBudgetApproval } from '@/api/queries/approvals'
import { decisionsKey } from '@/api/queries/decisions'
import { planQueryOptions } from '@/api/queries/plans'

/**
 * The host's answer to a budget overrun. Approving keeps the plan over `B_do`, rejecting makes the
 * plan within it the active one; both change the latest plan, so it and the log are read again.
 */
export function useBudgetDecision(tripId: string) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (decision: ApprovalDecision) => decideBudgetApproval(tripId, decision),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: planQueryOptions(tripId).queryKey }),
        queryClient.invalidateQueries({ queryKey: decisionsKey }),
      ])
    },
  })
  return {
    decide: (decision: ApprovalDecision) => mutation.mutateAsync(decision),
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}
