import { useQuery, useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { classifyApiError } from '@/api/errors'
import { invitationsQueryOptions } from '@/api/queries/invitations'
import { NAMED_INVITATION_MAX_USES, NAMED_INVITATION_VALID_DAYS } from '@/lib/vote-constants'

/** The API's own defaults (7 days, 10 people), sent explicitly because the generated type requires them. */
const INVITATION_DEFAULTS = { expires_in_days: 7, max_uses: 10 } as const

/** A named invitation (`profile_id`) is for one person and one use; the API enforces both. */
const namedInvitation = (profileId: string) => ({
  expires_in_days: NAMED_INVITATION_VALID_DAYS,
  max_uses: NAMED_INVITATION_MAX_USES,
  profile_id: profileId,
})

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
    // The answer holds the token: drop it from the cache as soon as nothing shows it.
    gcTime: 0,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: invitationsQueryOptions(tripId).queryKey }),
  })
  return {
    create: () =>
      mutation.mutate({ params: { path: { trip_id: tripId } }, body: INVITATION_DEFAULTS }),
    /** An invitation that hands this profile to the one person who opens it. */
    createNamed: (profileId: string) =>
      mutation.mutate({ params: { path: { trip_id: tripId } }, body: namedInvitation(profileId) }),
    /** Who the pending named invitation is for, to disable only that person's button. */
    pendingProfileId: mutation.isPending ? mutation.variables.body.profile_id : undefined,
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
    isPending: mutation.isPending,
    isError: mutation.isError,
  }
}
