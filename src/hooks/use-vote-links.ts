import { useQuery, useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { classifyApiError } from '@/api/errors'
import { voteLinksKey, voteLinksQueryOptions } from '@/api/queries/vote-links'
import { VOTE_LINK_VALID_DAYS } from '@/lib/vote-constants'

/** The voting links of a trip (state and last use, never the token). */
export function useVoteLinks(tripId: string) {
  const query = useQuery(voteLinksQueryOptions(tripId))
  return {
    links: query.data?.items ?? [],
    isPending: query.isPending,
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}

/** Creates a link for one person. The token lives only in `created`, in memory. */
export function useCreateVoteLink(tripId: string) {
  const queryClient = useQueryClient()
  const mutation = $api.useMutation('post', '/api/v1/trips/{trip_id}/vote-links', {
    // The answer holds the token: drop it from the cache as soon as nothing shows it.
    gcTime: 0,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: voteLinksKey(tripId) }),
  })
  return {
    create: (profileId: string) =>
      mutation.mutate({
        params: { path: { trip_id: tripId } },
        body: { profile_id: profileId, expires_in_days: VOTE_LINK_VALID_DAYS },
      }),
    created: mutation.data,
    /** Who the pending request is for, to disable only that person's button. */
    pendingProfileId: mutation.isPending ? mutation.variables.body.profile_id : undefined,
    error: mutation.error,
    /** Forgets the token. */
    reset: mutation.reset,
  }
}

export function useRevokeVoteLink(tripId: string) {
  const queryClient = useQueryClient()
  const mutation = $api.useMutation('delete', '/api/v1/trips/{trip_id}/vote-links/{link_id}', {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: voteLinksKey(tripId) }),
  })
  return {
    revoke: (linkId: string) =>
      mutation.mutate({ params: { path: { trip_id: tripId, link_id: linkId } } }),
    isPending: mutation.isPending,
    isError: mutation.isError,
  }
}
