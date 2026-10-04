import { CloudOff, TriangleAlert } from '@keyline-icons/react'
import { getRouteApi } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ApiError } from '@/api/errors'
import type { VoteLink } from '@/api/queries/vote-links'
import { LinkShare } from '@/components/shared/link-share'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { Button } from '@/components/ui/button'
import { RevokeVoteLinkDialog } from '@/components/voting/revoke-vote-link-dialog'
import { VoteLinkPanel } from '@/components/voting/vote-link-panel'
import { VoteSummary, VoteSummarySkeleton } from '@/components/voting/vote-summary'
import { useCreateInvitation } from '@/hooks/use-invitations'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useCreateVoteLink, useRevokeVoteLink, useVoteLinks } from '@/hooks/use-vote-links'
import { useVoteSummary } from '@/hooks/use-vote-summary'
import { formatDate } from '@/lib/format'
import { buildInviteLink } from '@/lib/invite-link'
import type { Person } from '@/lib/people'
import { hasAccount } from '@/lib/people'
import { VOTE_SUMMARY_PAGE_SIZE } from '@/lib/vote-constants'
import { buildVoteLink } from '@/lib/vote-link'
import { currentVoteLink } from '@/lib/vote-links'
import { m } from '@/paraglide/messages'

const route = getRouteApi('/trips_/$tripId')

interface TripVotingViewProps {
  tripId: string
  tripName: string
  /** Everybody on the trip; the people without an account get the tools. */
  people: Person[]
}

const createFailedMessage = (error: unknown, conflict: string, failed: string) =>
  error ? (error instanceof ApiError && error.status === 409 ? conflict : failed) : null

/**
 * Host tools for people without an account, under the Osoby tab: a voting link with a QR code, a
 * named invitation, and the group's answers place by place (asked again every two seconds).
 */
export function TripVotingView({ tripId, tripName, people }: TripVotingViewProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const links = useVoteLinks(tripId)
  const linkCreation = useCreateVoteLink(tripId)
  const revocation = useRevokeVoteLink(tripId)
  const invitation = useCreateInvitation(tripId)
  const [revoking, setRevoking] = useState<{ link: VoteLink; name: string } | null>(null)
  // Whom the dialog on screen is for; the secret itself is only in the mutation result.
  const [sharedFor, setSharedFor] = useState<string | null>(null)

  const offAccount = useMemo(() => people.filter((person) => !hasAccount(person)), [people])
  const rows = offAccount.map((person) => ({
    profileId: person.profile.id,
    name: person.profile.display_name,
    link: currentVoteLink(links.links, person.profile.id),
    linking: linkCreation.pendingProfileId === person.profile.id,
    inviting: invitation.pendingProfileId === person.profile.id,
  }))

  const summary = useVoteSummary(tripId, {
    page: search.vpage,
    size: VOTE_SUMMARY_PAGE_SIZE,
    sort: search.vsort,
    source: search.vsource,
    hasVeto: search.vveto ? true : undefined,
  })

  const setSearch = (
    patch: Partial<Pick<typeof search, 'vpage' | 'vsort' | 'vsource' | 'vveto'>>,
  ) => void navigate({ search: (prev) => ({ ...prev, vpage: 1, ...patch }), replace: true })

  const error =
    createFailedMessage(
      linkCreation.error,
      m.vote_link_create_conflict(),
      m.vote_link_create_failed(),
    ) ??
    createFailedMessage(invitation.error, m.invite_person_conflict(), m.invite_create_failed()) ??
    (revocation.isError ? m.vote_link_revoke_failed() : null)

  const linkCreated = linkCreation.created
  const invitationCreated = invitation.created

  return (
    <>
      <VoteLinkPanel
        people={rows}
        error={error}
        linksFailed={links.problem !== null}
        onRetryLinks={links.refetch}
        onCreateLink={(profileId) => {
          invitation.reset()
          setSharedFor(
            offAccount.find((p) => p.profile.id === profileId)?.profile.display_name ?? null,
          )
          linkCreation.create(profileId)
        }}
        onInvite={(profileId) => {
          linkCreation.reset()
          setSharedFor(
            offAccount.find((p) => p.profile.id === profileId)?.profile.display_name ?? null,
          )
          invitation.createNamed(profileId)
        }}
        onRevokeLink={(link, name) => setRevoking({ link, name })}
      />

      <section aria-labelledby="vote-summary-heading" className="flex flex-col gap-3 border-t py-6">
        <div className="flex flex-col gap-1">
          <h2 id="vote-summary-heading" className="font-medium text-base">
            {m.vote_summary_title()}
          </h2>
          <p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
            {m.vote_summary_description()}
          </p>
        </div>
        {summary.isPending ? (
          <VoteSummarySkeleton />
        ) : summary.problem || !summary.page ? (
          <div role="alert" className="flex flex-col items-start gap-2 text-sm">
            <p className="flex items-center gap-2 text-destructive">
              {summary.problem === 'offline' ? (
                <CloudOff aria-hidden="true" className="size-4" />
              ) : (
                <TriangleAlert aria-hidden="true" className="size-4" />
              )}
              {summary.problem === 'offline'
                ? m.trips_offline_title()
                : m.vote_summary_load_failed()}
            </p>
            <Button variant="outline" className="h-11 md:h-9" onClick={summary.refetch}>
              {m.action_retry()}
            </Button>
          </div>
        ) : (
          <VoteSummary
            page={summary.page}
            source={search.vsource}
            vetoOnly={search.vveto === true}
            sort={search.vsort}
            onSourceChange={(vsource) => setSearch({ vsource })}
            onVetoOnlyChange={(vveto) => setSearch({ vveto: vveto || undefined })}
            onSortChange={(vsort) => setSearch({ vsort })}
            onPageChange={(vpage) => setSearch({ vpage })}
          />
        )}
      </section>

      <RevokeVoteLinkDialog
        name={revoking?.name ?? null}
        isDesktop={isDesktop}
        isRevoking={revocation.isPending}
        onCancel={() => setRevoking(null)}
        onConfirm={() => {
          if (revoking) revocation.revoke(revoking.link.id)
          setRevoking(null)
        }}
      />

      <ResponsiveModal
        open={linkCreated !== undefined}
        onOpenChange={(open) => {
          if (!open) linkCreation.reset()
        }}
        isDesktop={isDesktop}
        title={m.vote_link_modal_title({ name: sharedFor ?? '' })}
        description={m.vote_link_modal_description()}
      >
        {linkCreated && (
          <LinkShare
            link={buildVoteLink(window.location.origin, linkCreated.url)}
            qrLabel={m.vote_link_qr_label()}
            validity={m.vote_link_validity({ date: formatDate(linkCreated.expires_at) })}
            linkLabel={m.vote_link_field_label()}
            shareTitle={tripName}
            shareText={m.vote_link_share_text({ trip: tripName })}
            fieldId="vote-link"
            qrClassName="h-auto w-full max-w-72 rounded-lg border"
          />
        )}
      </ResponsiveModal>

      <ResponsiveModal
        open={invitationCreated !== undefined}
        onOpenChange={(open) => {
          if (!open) invitation.reset()
        }}
        isDesktop={isDesktop}
        title={m.invite_person_modal_title({ name: sharedFor ?? '' })}
        description={m.invite_person_modal_description()}
      >
        {invitationCreated && (
          <LinkShare
            link={buildInviteLink(window.location.origin, invitationCreated.token)}
            qrLabel={m.invite_qr_label()}
            validity={m.invite_person_validity({ date: formatDate(invitationCreated.expires_at) })}
            linkLabel={m.invite_link_label()}
            shareTitle={tripName}
            shareText={m.invite_share_text({ trip: tripName })}
            fieldId="named-invite-link"
            qrClassName="h-auto w-full max-w-72 rounded-lg border"
          />
        )}
      </ResponsiveModal>
    </>
  )
}
