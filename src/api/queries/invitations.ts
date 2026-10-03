import { $api, type Schemas } from '@/api/client'

export type Invitation = Schemas['InvitationRead']
export type InvitationCreated = Schemas['InvitationCreated']
export type InvitationPreview = Schemas['InvitationPreview']
export type JoinResult = Schemas['JoinResult']

export const invitationsQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/invitations', {
    params: { path: { trip_id: tripId } },
  })

/**
 * What the invitation token points at. The token travels in the body (never the URL). Nothing is
 * retried or kept: a dead token answers 404 for good, and the cache must not outlive the page.
 */
export const invitationPreviewQueryOptions = (token: string) =>
  $api.queryOptions(
    'post',
    '/api/v1/invitations/preview',
    { body: { token } },
    { retry: false, gcTime: 0, staleTime: Number.POSITIVE_INFINITY, refetchOnWindowFocus: false },
  )
