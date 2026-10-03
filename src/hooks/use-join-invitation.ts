import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { $api } from '@/api/client'
import { classifyApiError } from '@/api/errors'
import { invitationPreviewQueryOptions } from '@/api/queries/invitations'
import { tripsQueryOptions } from '@/api/queries/trips'
import { clearJoinToken } from '@/lib/invite-link'

/** Preview (trip name) and accept for one invitation token; needs a signed-in account. */
export function useJoinInvitation(token: string | null, signedIn: boolean) {
  const queryClient = useQueryClient()
  const preview = useQuery({
    ...invitationPreviewQueryOptions(token ?? ''),
    enabled: signedIn && token !== null,
  })
  const previewProblem = preview.isError ? classifyApiError(preview.error) : null

  // Signed in: the login round-trip is over, so nothing of the token stays in storage.
  useEffect(() => {
    if (signedIn) clearJoinToken()
  }, [signedIn])

  const mutation = $api.useMutation('post', '/api/v1/invitations/accept', {
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: tripsQueryOptions().queryKey })
    },
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
