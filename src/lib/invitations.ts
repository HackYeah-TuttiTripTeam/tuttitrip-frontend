import type { Invitation } from '@/api/queries/invitations'

export type InvitationStatus = 'active' | 'expired' | 'revoked' | 'used_up'

/** Why an invitation works or not, in the order that matters to the host. */
export function invitationStatus(invitation: Invitation, now: Date = new Date()): InvitationStatus {
  if (invitation.revoked_at) return 'revoked'
  if (new Date(invitation.expires_at) <= now) return 'expired'
  if (invitation.uses >= invitation.max_uses) return 'used_up'
  return 'active'
}
