import type { Invitation } from '@/api/queries/invitations'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import { type InvitationStatus, invitationStatus } from '@/lib/invitations'
import { m } from '@/paraglide/messages'

const STATUS_LABELS: Record<InvitationStatus, () => string> = {
  active: m.invite_status_active,
  expired: m.invite_status_expired,
  revoked: m.invite_status_revoked,
  used_up: m.invite_status_used_up,
}

interface InvitationListProps {
  invitations: Invitation[]
  /** Asks to revoke; the caller confirms before anything is sent. */
  onRevoke: (invitation: Invitation) => void
  now?: Date
}

/** Working invitations first, each with its expiry, uses and Revoke; older ones fold away. */
export function InvitationList({ invitations, onRevoke, now = new Date() }: InvitationListProps) {
  const rows = invitations.map((invitation) => ({
    invitation,
    status: invitationStatus(invitation, now),
  }))
  const active = rows.filter((row) => row.status === 'active')
  const earlier = rows.filter((row) => row.status !== 'active')

  const renderRow = ({ invitation, status }: (typeof rows)[number]) => (
    <li key={invitation.id} className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="flex flex-wrap items-center gap-x-2 text-sm">
          <span className="font-medium">{STATUS_LABELS[status]()}</span>
          <span className="text-muted-foreground">
            {status === 'expired'
              ? m.invite_row_expired({ date: formatDate(invitation.expires_at) })
              : m.invite_row_expires({ date: formatDate(invitation.expires_at) })}
          </span>
        </p>
        <p className="text-muted-foreground text-sm tabular-nums">
          {m.invite_row_uses({ uses: invitation.uses, max: invitation.max_uses })}
        </p>
      </div>
      {status === 'active' && (
        <Button
          variant="outline"
          className="h-11 shrink-0 md:h-9"
          aria-label={m.invite_revoke_label({ date: formatDate(invitation.expires_at) })}
          onClick={() => onRevoke(invitation)}
        >
          {m.invite_revoke()}
        </Button>
      )}
    </li>
  )

  return (
    <div className="flex flex-col">
      {active.length > 0 && <ul className="divide-y">{active.map(renderRow)}</ul>}
      {earlier.length > 0 && (
        <details className="group border-t first:border-t-0">
          <summary className="flex h-11 cursor-pointer items-center text-muted-foreground text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            {m.invite_earlier({ count: earlier.length })}
          </summary>
          <ul className="divide-y text-muted-foreground">{earlier.map(renderRow)}</ul>
        </details>
      )}
    </div>
  )
}

export function InvitationListSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3 py-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-5 w-1/3" />
    </div>
  )
}
