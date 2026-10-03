import { useQuery, useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { classifyApiError } from '@/api/errors'
import { invitationsQueryOptions } from '@/api/queries/invitations'

/** The API's own defaults (7 days, 10 people), sent explicitly because the generated type requires them. */
const INVITATION_DEFAULTS = { expires_in_days: 7, max_uses: 10 } as const

/** The trip's invitations without the secret (co-host and host only). */
export function useInvitations(tripId: string) {
  const query = useQuery(invitationsQueryOptions(tripId))
  return {
    invitations: query.data ?? [],
    isPending: query.isPending,
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}

/** Creates a link. The token lives only in `data` of this mutation, in memory. */
export function useCreateInvitation(tripId: string) {
  const queryClient = useQueryClient()
  const mutation = $api.useMutation('post', '/api/v1/trips/{trip_id}/invitations', {
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: invitationsQueryOptions(tripId).queryKey }),
  })
  return {
    create: () =>
      mutation.mutate({ params: { path: { trip_id: tripId } }, body: INVITATION_DEFAULTS }),
    created: mutation.data,
    isPending: mutation.isPending,
    error: mutation.error,
    /** Forgets the token. */
    reset: mutation.reset,
  }
}

export function useRevokeInvitation(tripId: string) {
  const queryClient = useQueryClient()
  const mutation = $api.useMutation(
    'delete',
    '/api/v1/trips/{trip_id}/invitations/{invitation_id}',
    {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: invitationsQueryOptions(tripId).queryKey }),
    },
  )
  return {
    revoke: (invitationId: string) =>
      mutation.mutate({ params: { path: { trip_id: tripId, invitation_id: invitationId } } }),
    pendingId: mutation.isPending ? mutation.variables?.params.path.invitation_id : undefined,
    isError: mutation.isError,
  }
}
