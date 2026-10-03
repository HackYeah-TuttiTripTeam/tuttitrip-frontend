import { UserPlus } from '@keyline-icons/react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface InvitePanelProps {
  onInvite: () => void
  isInviting: boolean
  /** Error text for creating a link. */
  inviteError: string | null
  /** The list of sent invitations, or its loading, empty and error state. */
  children: ReactNode
}

/** The People tab for the host: the Invite action above the invitations already sent. */
export function InvitePanel({ onInvite, isInviting, inviteError, children }: InvitePanelProps) {
  return (
    <section aria-labelledby="invite-heading" className="flex flex-col gap-4 border-t py-6">
      <div className="flex flex-col gap-1">
        <h2 id="invite-heading" className="font-medium text-base">
          {m.invite_title()}
        </h2>
        <p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
          {m.invite_description()}
        </p>
        <p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
          {m.invite_accounts_only()}
        </p>
      </div>

      <div className="flex flex-col items-start gap-2">
        <Button className="h-11 md:h-9" disabled={isInviting} onClick={onInvite}>
          <UserPlus aria-hidden="true" />
          {isInviting ? m.invite_creating() : m.invite_action()}
        </Button>
        {inviteError && (
          <p role="alert" className="text-destructive text-sm">
            {inviteError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="font-medium text-sm">{m.invite_list_title()}</h3>
        {children}
        <p className="text-muted-foreground text-sm">{m.invite_list_hint()}</p>
      </div>
    </section>
  )
}
