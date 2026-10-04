import { Link as LinkIcon, QrCode as QrIcon, UserPlus } from '@keyline-icons/react'
import type { VoteLink } from '@/api/queries/vote-links'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { m } from '@/paraglide/messages'

export interface OffAccountPerson {
  profileId: string
  name: string
  /** The person's current link, if they ever had one. */
  link: VoteLink | undefined
  /** An invitation for this person is being created. */
  inviting: boolean
  /** A voting link for this person is being created. */
  linking: boolean
}

interface VoteLinkPanelProps {
  people: OffAccountPerson[]
  onCreateLink: (profileId: string) => void
  onRevokeLink: (link: VoteLink, name: string) => void
  onInvite: (profileId: string) => void
  /** Text of the last failed create (link or invitation), or null. */
  error: string | null
  linksFailed: boolean
  onRetryLinks: () => void
}

function statusText(link: VoteLink | undefined): string {
  if (!link) return m.vote_link_status_none()
  const status = link.state
  if (status === 'revoked') return m.vote_link_status_revoked()
  if (status === 'expired') return m.vote_link_status_expired({ date: formatDate(link.expires_at) })
  return link.last_used_at
    ? m.vote_link_status_used({ date: formatDate(link.last_used_at) })
    : m.vote_link_status_active({ date: formatDate(link.expires_at) })
}

/**
 * People without an account, one row each: the voting link (QR for a phone, no install) and the
 * named invitation that hands them their profile. Both secrets are shown once, in a dialog.
 */
export function VoteLinkPanel({
  people,
  onCreateLink,
  onRevokeLink,
  onInvite,
  error,
  linksFailed,
  onRetryLinks,
}: VoteLinkPanelProps) {
  return (
    <section aria-labelledby="vote-links-heading" className="flex flex-col gap-4 border-t py-6">
      <div className="flex flex-col gap-1">
        <h2 id="vote-links-heading" className="font-medium text-base">
          {m.vote_links_title()}
        </h2>
        <p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
          {m.vote_links_description()}
        </p>
      </div>

      {linksFailed && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm">
          <p className="text-destructive">{m.vote_links_load_failed()}</p>
          <Button variant="outline" className="h-11 md:h-9" onClick={onRetryLinks}>
            {m.action_retry()}
          </Button>
        </div>
      )}

      {people.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.vote_links_empty()}</p>
      ) : (
        <ul aria-label={m.vote_links_list_label()} className="flex flex-col divide-y border-y">
          {people.map((person) => {
            const link = person.link
            const status = link?.state
            return (
              <li key={person.profileId} className="flex flex-col gap-3 py-4">
                <div className="flex flex-col gap-0.5">
                  <p className="font-medium">{person.name}</p>
                  <p className="text-muted-foreground text-sm">{statusText(link)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="h-11 md:h-9"
                    disabled={person.linking}
                    onClick={() => onCreateLink(person.profileId)}
                    aria-label={
                      status === 'active'
                        ? m.vote_link_new_label({ name: person.name })
                        : m.vote_link_create_label({ name: person.name })
                    }
                  >
                    <QrIcon aria-hidden="true" />
                    {person.linking
                      ? m.vote_link_creating()
                      : status === 'active'
                        ? m.vote_link_new()
                        : m.vote_link_create()}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 md:h-9"
                    disabled={person.inviting}
                    onClick={() => onInvite(person.profileId)}
                    aria-label={m.invite_person_label({ name: person.name })}
                  >
                    <UserPlus aria-hidden="true" />
                    {m.invite_person()}
                  </Button>
                  {link && status === 'active' && (
                    <Button
                      variant="ghost"
                      className="h-11 md:h-9"
                      onClick={() => onRevokeLink(link, person.name)}
                      aria-label={m.vote_link_revoke_label({ name: person.name })}
                    >
                      <LinkIcon aria-hidden="true" />
                      {m.vote_link_revoke()}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <p className="max-w-prose text-muted-foreground text-sm">{m.vote_links_hint()}</p>
    </section>
  )
}
