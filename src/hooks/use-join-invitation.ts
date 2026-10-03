import { useQuery, useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { classifyApiError } from '@/api/errors'
import { invitationPreviewQueryOptions } from '@/api/queries/invitations'
import { tripsQueryOptions } from '@/api/queries/trips'

/** Preview (trip name) and accept for one invitation token; needs a signed-in account. */
export function useJoinInvitation(token: string | null, signedIn: boolean) {
  const queryClient = useQueryClient()
  const preview = useQuery({
    ...invitationPreviewQueryOptions(token ?? ''),
    enabled: signedIn && token !== null,
  })
  const previewProblem = preview.isError ? classifyApiError(preview.error) : null

  const mutation = $api.useMutation('post', '/api/v1/invitations/accept', {
    // The answer holds no secret, but the request body does: keep nothing in the mutation cache.
    gcTime: 0,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripsQueryOptions().queryKey }),
  })

  return {
    trip: preview.data,
    isPending: preview.isPending && preview.fetchStatus !== 'idle',
    problem: previewProblem,
    refetch: () => void preview.refetch(),
    accept: (displayName: string | null) => {
      if (token) mutation.mutate({ body: { token, display_name: displayName } })
    },
    joined: mutation.data,
    isJoining: mutation.isPending,
    joinProblem: mutation.isError ? classifyApiError(mutation.error) : null,
  }
}
