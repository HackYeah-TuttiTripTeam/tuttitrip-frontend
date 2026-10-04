import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { ApiError } from '@/api/errors'
import { planQueryOptions } from '@/api/queries/plans'
import { proposalQueryOptions } from '@/api/queries/proposals'

export type SendProposalError = 'forbidden' | 'outdated' | 'failed'

/** "Send for approval": proposes the latest plan; sending again replaces the open proposal. */
export function useSendProposal(tripId: string) {
  const queryClient = useQueryClient()
  const mutation = $api.useMutation('post', '/api/v1/trips/{trip_id}/proposals', {
    onSuccess: (proposal) => {
      queryClient.setQueryData(proposalQueryOptions(tripId).queryKey, proposal)
    },
    // The plan changed under the host's hands: show the newest one before they try again.
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: planQueryOptions(tripId).queryKey })
      }
    },
  })

  const error: SendProposalError | null = !mutation.error
    ? null
    : mutation.error instanceof ApiError && mutation.error.status === 403
      ? 'forbidden'
      : mutation.error instanceof ApiError && mutation.error.status === 409
        ? 'outdated'
        : 'failed'

  return {
    send: () => mutation.mutate({ params: { path: { trip_id: tripId } }, body: null }),
    isPending: mutation.isPending,
    error,
  }
}
