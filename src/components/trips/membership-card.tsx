import { CircleCheck, DoorOpen } from '@keyline-icons/react'
import type { MemberStatus } from '@/api/queries/members'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface MembershipCardProps {
  status: MemberStatus
  isHost: boolean
  busy: boolean
  error: string | null
  onConfirm: () => void
  onLeave: () => void
}

/** The caller's own part: confirm going, or leave. The host must hand the trip over first. */
export function MembershipCard({
  status,
  isHost,
  busy,
  error,
  onConfirm,
  onLeave,
}: MembershipCardProps) {
  const pending = status === 'pending'
  return (
    <section
      aria-labelledby="membership-title"
      className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="membership-title" className="font-medium text-base">
          {pending ? m.membership_pending_title() : m.membership_confirmed_title()}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {pending
            ? m.membership_pending_body()
            : isHost
              ? m.membership_host_body()
              : m.membership_confirmed_body()}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        {pending && (
          <Button disabled={busy} onClick={onConfirm} className="h-11 sm:h-9">
            <CircleCheck />
            {m.membership_confirm()}
          </Button>
        )}
        {!isHost && (
          <Button variant="outline" disabled={busy} onClick={onLeave} className="h-11 sm:h-9">
            <DoorOpen />
            {m.membership_leave()}
          </Button>
        )}
      </div>
    </section>
  )
}
