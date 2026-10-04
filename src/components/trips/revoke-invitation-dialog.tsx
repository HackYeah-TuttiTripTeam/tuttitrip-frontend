import type { Invitation } from '@/api/queries/invitations'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { m } from '@/paraglide/messages'

interface RevokeInvitationDialogProps {
  /** The invitation to revoke; null keeps the dialog closed. */
  invitation: Invitation | null
  isDesktop: boolean
  isRevoking: boolean
  onConfirm: (invitation: Invitation) => void
  onCancel: () => void
}

/** Revoking kills a link people may already hold, so it asks first and names the invitation. */
export function RevokeInvitationDialog({
  invitation,
  isDesktop,
  isRevoking,
  onConfirm,
  onCancel,
}: RevokeInvitationDialogProps) {
  return (
    <ResponsiveModal
      open={invitation !== null}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
      isDesktop={isDesktop}
      title={m.invite_revoke_confirm_title()}
      description={
        invitation
          ? m.invite_revoke_confirm_body({
              date: formatDate(invitation.expires_at),
              uses: invitation.uses,
              max: invitation.max_uses,
            })
          : ''
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          variant="destructive"
          className="h-11 flex-1 md:h-9"
          disabled={isRevoking}
          onClick={() => invitation && onConfirm(invitation)}
        >
          {m.invite_revoke_confirm()}
        </Button>
        <Button variant="outline" className="h-11 flex-1 md:h-9" onClick={onCancel}>
          {m.invite_revoke_keep()}
        </Button>
      </div>
    </ResponsiveModal>
  )
}
