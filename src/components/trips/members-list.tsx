import { Crown, MoreHorizontal, UserMinus } from '@keyline-icons/react'
import type { Member } from '@/api/queries/members'
import { PersonAvatar } from '@/components/profiles/person-avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { actionsOn } from '@/lib/members'
import { m } from '@/paraglide/messages'

const ROLE_LABELS: Record<Member['role'], () => string> = {
  host: m.trip_role_host,
  co_host: m.trip_role_co_host,
  member: m.trip_role_member,
}

interface MembersListProps {
  members: Member[]
  /** The caller's role on the trip: it decides which actions each row offers. */
  myRole: Member['role']
  busy: boolean
  onSetRole: (member: Member, role: 'member' | 'co_host') => void
  onTransferHost: (member: Member) => void
  onRemove: (member: Member) => void
}

/** People with an account: role, whether they confirmed, and what the caller may do to them. */
export function MembersList({
  members,
  myRole,
  busy,
  onSetRole,
  onTransferHost,
  onRemove,
}: MembersListProps) {
  return (
    <ul aria-label={m.members_list_label()} className="divide-y border-y">
      {members.map((member) => {
        const actions = actionsOn(myRole, member)
        const hasActions = actions.setRole !== null || actions.transferHost || actions.remove
        return (
          <li key={member.profile_id} className="flex items-center gap-3 py-3">
            <PersonAvatar id={member.profile_id} name={member.display_name} hasAccount />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="truncate font-medium text-base">{member.display_name}</span>
                {member.is_me && (
                  <span className="text-muted-foreground text-sm">{m.members_you()}</span>
                )}
              </p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="rounded-full border px-2.5 py-0.5 font-medium text-foreground text-xs">
                  {ROLE_LABELS[member.role]()}
                </span>
                <span
                  className={
                    member.status === 'confirmed' ? 'text-foreground' : 'text-muted-foreground'
                  }
                >
                  {member.status === 'confirmed'
                    ? m.members_status_confirmed()
                    : m.members_status_pending()}
                </span>
              </p>
            </div>
            {hasActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    aria-label={m.members_actions_label({ name: member.display_name })}
                    className="size-11 shrink-0 rounded-full text-muted-foreground"
                  >
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {actions.setRole && (
                    <DropdownMenuItem
                      onSelect={() => actions.setRole && onSetRole(member, actions.setRole)}
                    >
                      <Crown />
                      {actions.setRole === 'co_host'
                        ? m.members_action_make_co_host()
                        : m.members_action_revoke_co_host()}
                    </DropdownMenuItem>
                  )}
                  {actions.transferHost && (
                    <DropdownMenuItem onSelect={() => onTransferHost(member)}>
                      <Crown />
                      {m.members_action_transfer_host()}
                    </DropdownMenuItem>
                  )}
                  {actions.remove && (
                    <>
                      {(actions.setRole || actions.transferHost) && <DropdownMenuSeparator />}
                      <DropdownMenuItem variant="destructive" onSelect={() => onRemove(member)}>
                        <UserMinus />
                        {m.members_action_remove()}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function MembersListSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col divide-y border-y">
      {['a', 'b', 'c'].map((key) => (
        <div key={key} className="flex items-center gap-3 py-3">
          <div className="size-10 rounded-full bg-muted" />
          <div className="h-10 flex-1 rounded-md bg-muted" />
        </div>
      ))}
    </div>
  )
}
