import { useState } from 'react'
import { ApiError } from '@/api/errors'
import type { Invitation } from '@/api/queries/invitations'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { InvitationList, InvitationListSkeleton } from '@/components/trips/invitation-list'
import { InvitationShare } from '@/components/trips/invitation-share'
import { InvitePanel } from '@/components/trips/invite-panel'
import { RevokeInvitationDialog } from '@/components/trips/revoke-invitation-dialog'
import { Button } from '@/components/ui/button'
import { useCreateInvitation, useInvitations, useRevokeInvitation } from '@/hooks/use-invitations'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { buildInviteLink } from '@/lib/invite-link'
import { m } from '@/paraglide/messages'

interface TripInvitationsViewProps {
  tripId: string
  tripName: string
  /** Names of the people on the trip by profile id (for named invitations). */
  profileNames: ReadonlyMap<string, string>
}

/** Invitation tools for the host and co-hosts, shown under the people of the Osoby tab. */
export function TripInvitationsView({ tripId, tripName, profileNames }: TripInvitationsViewProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const list = useInvitations(tripId)
  const creation = useCreateInvitation(tripId)
  const revocation = useRevokeInvitation(tripId)
  const [revoking, setRevoking] = useState<Invitation | null>(null)

  const createError = creation.error
    ? creation.error instanceof ApiError && creation.error.status === 409
      ? m.invite_create_too_many()
      : m.invite_create_failed()
    : null

  return (
    <>
      <InvitePanel
        onInvite={creation.create}
        isInviting={creation.isPending}
        inviteError={createError}
      >
        {list.isPending ? (
          <InvitationListSkeleton />
        ) : list.problem ? (
          <div role="alert" className="flex flex-col items-start gap-2 py-3 text-sm">
            <p className="text-destructive">{m.invite_list_load_failed()}</p>
            <Button variant="outline" className="h-11 md:h-9" onClick={list.refetch}>
              {m.action_retry()}
            </Button>
          </div>
        ) : list.invitations.length === 0 ? (
          <p className="py-3 text-muted-foreground text-sm">{m.invite_list_empty()}</p>
        ) : (
          <>
            <InvitationList
              invitations={list.invitations}
              onRevoke={setRevoking}
              profileNames={profileNames}
            />
            <p className="text-muted-foreground text-sm">{m.invite_list_hint()}</p>
          </>
        )}
        {revocation.isError && (
          <p role="alert" className="text-destructive text-sm">
            {m.invite_revoke_failed()}
          </p>
        )}
      </InvitePanel>

      <RevokeInvitationDialog
        invitation={revoking}
        isDesktop={isDesktop}
        isRevoking={revocation.isPending}
        onCancel={() => setRevoking(null)}
        onConfirm={(invitation) => {
          revocation.revoke(invitation.id)
          setRevoking(null)
        }}
      />

      <ResponsiveModal
        open={creation.created !== undefined}
        onOpenChange={(open) => {
          if (!open) creation.reset()
        }}
        isDesktop={isDesktop}
        title={m.invite_modal_title()}
        description={m.invite_modal_description()}
      >
        {creation.created && (
          <InvitationShare
            link={buildInviteLink(window.location.origin, creation.created.token)}
            tripName={tripName}
            expiresAt={creation.created.expires_at}
            maxUses={creation.created.max_uses}
          />
        )}
      </ResponsiveModal>
    </>
  )
}
