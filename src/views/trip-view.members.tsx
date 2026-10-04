import { CloudOff, TriangleAlert, Users } from '@keyline-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { Member } from '@/api/queries/members'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StatusMessage } from '@/components/shared/status-message'
import { MembersList, MembersListSkeleton } from '@/components/trips/members-list'
import { MembershipCard } from '@/components/trips/membership-card'
import { Button } from '@/components/ui/button'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useMemberActions } from '@/hooks/use-member-actions'
import { useMembers } from '@/hooks/use-members'
import { useSession } from '@/hooks/use-session'
import { m } from '@/paraglide/messages'

interface TripMembersViewProps {
  tripId: string
  tripName: string
  myRole: Member['role']
  myStatus: Member['status']
}

type Pending =
  | { kind: 'remove'; member: Member }
  | { kind: 'transfer'; member: Member }
  | { kind: 'leave' }

/**
 * The Członkowie tab. Named `trip-view.members` because a view may only import views of its own
 * name (rule 1); TripView renders it and passes the trip and the caller's role and status.
 */
export function TripMembersView({ tripId, tripName, myRole, myStatus }: TripMembersViewProps) {
  const session = useSession()
  const navigate = useNavigate()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const { members, isPending, problem, refetch } = useMembers(tripId, session.status)
  const actions = useMemberActions(tripId, () => navigate({ to: '/trips' }))
  const [pending, setPending] = useState<Pending | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setPending(null)
    setDialogError(null)
  }

  /** Runs one write: success clears the message, failure puts the API's answer where it is seen. */
  async function run(
    action: () => ReturnType<typeof actions.confirm>,
    onFailure: (message: string) => void,
    onDone: () => void = () => undefined,
  ) {
    const result = await action()
    if (result.ok) {
      setError(null)
      onDone()
    } else onFailure(result.message)
  }

  const confirmPending = () => {
    if (!pending) return
    const done = () => close()
    if (pending.kind === 'remove') {
      void run(() => actions.remove(pending.member), setDialogError, done)
    } else if (pending.kind === 'transfer') {
      void run(() => actions.transferHost(pending.member), setDialogError, done)
    } else {
      void run(() => actions.leave(), setDialogError, done)
    }
  }

  if (isPending) return <MembersListSkeleton />

  if (problem) {
    return (
      <StatusMessage
        role="alert"
        icon={problem === 'offline' ? <CloudOff /> : <TriangleAlert />}
        title={problem === 'offline' ? m.trips_offline_title() : m.members_load_failed_title()}
        action={
          <Button variant="outline" onClick={refetch}>
            {m.action_retry()}
          </Button>
        }
      >
        {problem === 'offline' ? m.trips_offline_body() : m.trips_load_failed_body()}
      </StatusMessage>
    )
  }

  const dialog = dialogCopy(pending, tripName)

  return (
    <div className="flex flex-col gap-6">
      <MembershipCard
        status={myStatus}
        isHost={myRole === 'host'}
        busy={actions.isPending}
        error={error}
        onConfirm={() => void run(() => actions.confirm(), setError)}
        onLeave={() => setPending({ kind: 'leave' })}
      />

      {members.length === 0 ? (
        <StatusMessage icon={<Users />} title={m.members_empty_title()}>
          {m.members_empty_body()}
        </StatusMessage>
      ) : (
        <MembersList
          members={members}
          myRole={myRole}
          busy={actions.isPending}
          onSetRole={(member, role) => void run(() => actions.setRole(member, role), setError)}
          onTransferHost={(member) => setPending({ kind: 'transfer', member })}
          onRemove={(member) => setPending({ kind: 'remove', member })}
        />
      )}

      <ConfirmDialog
        open={pending !== null}
        isDesktop={isDesktop}
        title={dialog.title}
        description={dialog.description}
        confirmLabel={dialog.confirm}
        pending={actions.isPending}
        error={dialogError}
        onConfirm={confirmPending}
        onCancel={close}
      />
    </div>
  )
}

function dialogCopy(pending: Pending | null, tripName: string) {
  switch (pending?.kind) {
    case 'remove':
      return {
        title: m.members_remove_title({ name: pending.member.display_name }),
        description: m.members_remove_body({ name: pending.member.display_name }),
        confirm: m.members_remove_confirm(),
      }
    case 'transfer':
      return {
        title: m.members_transfer_title({ name: pending.member.display_name }),
        description: m.members_transfer_body({ name: pending.member.display_name }),
        confirm: m.members_transfer_confirm(),
      }
    default:
      return {
        title: m.membership_leave_title(),
        description: m.membership_leave_body({ name: tripName }),
        confirm: m.membership_leave_confirm(),
      }
  }
}
