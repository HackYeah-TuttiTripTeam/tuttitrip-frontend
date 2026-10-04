import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { ApiError } from '@/api/errors'
import { type ProposalDecision, proposalQueryOptions } from '@/api/queries/proposals'
import { PROPOSAL_OUTDATED_CODE } from '@/lib/constants'
import { detailCode } from '@/lib/proposals'

export type ResponseError = 'outdated' | 'forbidden' | 'failed'

/**
 * Approve, reject or comment. A new answer replaces the earlier one. A 409 `proposal.outdated`
 * means the plan changed after the proposal was sent: the proposal is read again, and it then
 * says `outdated`, which the card explains.
 */
export function useProposalResponse(tripId: string, proposalId: string) {
  const queryClient = useQueryClient()
  const queryKey = proposalQueryOptions(tripId).queryKey
  const mutation = $api.useMutation(
    'put',
    '/api/v1/trips/{trip_id}/proposals/{proposal_id}/response',
    {
      onSuccess: (proposal) => queryClient.setQueryData(queryKey, proposal),
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) {
          void queryClient.invalidateQueries({ queryKey })
        }
      },
    },
  )

  const error: ResponseError | null = !mutation.error
    ? null
    : mutation.error instanceof ApiError && mutation.error.status === 409
      ? detailCode(mutation.error.detail) === PROPOSAL_OUTDATED_CODE
        ? 'outdated'
        : 'failed'
      : mutation.error instanceof ApiError && mutation.error.status === 403
        ? 'forbidden'
        : 'failed'

  return {
    respond: (decision: ProposalDecision, remark: string) => {
      const text = remark.trim()
      mutation.mutate({
        params: { path: { trip_id: tripId, proposal_id: proposalId } },
        body: { decision, remark: text === '' ? null : text },
      })
    },
    isPending: mutation.isPending,
    reset: mutation.reset,
    error,
  }
}
