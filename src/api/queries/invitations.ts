import { queryOptions } from '@tanstack/react-query'
import { $api, fetchClient, type Schemas } from '@/api/client'

export type Invitation = Schemas['InvitationRead']
export type InvitationCreated = Schemas['InvitationCreated']
export type InvitationPreview = Schemas['InvitationPreview']
export type JoinResult = Schemas['JoinResult']

export const invitationsQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/invitations', {
    params: { path: { trip_id: tripId } },
  })

/**
 * What the invitation token points at. The token travels in the body of a POST made by the
 * query function, so it is never part of the query key (which is cached and shown in devtools).
 * Nothing is retried or kept: a dead token answers 404 for good.
 */
export const invitationPreviewQueryOptions = (token: string) =>
  queryOptions({
    queryKey: ['invitations', 'preview'],
    queryFn: async (): Promise<InvitationPreview> => {
      const { data } = await fetchClient.POST('/api/v1/invitations/preview', { body: { token } })
      if (!data) throw new Error('Empty invitation preview')
      return data
    },
    retry: false,
    gcTime: 0,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  })
