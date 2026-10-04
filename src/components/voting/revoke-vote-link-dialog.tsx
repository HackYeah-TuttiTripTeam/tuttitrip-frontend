import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface RevokeVoteLinkDialogProps {
  /** Whose link would be revoked; null keeps the dialog closed. */
  name: string | null
  isDesktop: boolean
  isRevoking: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Revoking kills a QR code that may be on somebody's phone, so it asks first. */
export function RevokeVoteLinkDialog({
  name,
  isDesktop,
  isRevoking,
  onConfirm,
  onCancel,
}: RevokeVoteLinkDialogProps) {
  return (
    <ResponsiveModal
      open={name !== null}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
      isDesktop={isDesktop}
      title={m.vote_link_revoke_confirm_title()}
      description={name ? m.vote_link_revoke_confirm_body({ name }) : ''}
    >
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          variant="destructive"
          className="h-11 flex-1 md:h-9"
          disabled={isRevoking}
          onClick={onConfirm}
        >
          {m.vote_link_revoke_confirm()}
        </Button>
        <Button variant="outline" className="h-11 flex-1 md:h-9" onClick={onCancel}>
          {m.vote_link_revoke_keep()}
        </Button>
      </div>
    </ResponsiveModal>
  )
}
