import { LinkShare } from '@/components/shared/link-share'
import { formatDate } from '@/lib/format'
import { m } from '@/paraglide/messages'

interface InvitationShareProps {
  link: string
  tripName: string
  expiresAt: string
  maxUses: number
}

/** The fresh invitation: a QR code to scan, and the link to share or copy. */
export function InvitationShare({ link, tripName, expiresAt, maxUses }: InvitationShareProps) {
  return (
    <LinkShare
      link={link}
      qrLabel={m.invite_qr_label()}
      validity={m.invite_validity({ date: formatDate(expiresAt), max: maxUses })}
      linkLabel={m.invite_link_label()}
      shareTitle={tripName}
      shareText={m.invite_share_text({ trip: tripName })}
      fieldId="invite-link"
    />
  )
}
