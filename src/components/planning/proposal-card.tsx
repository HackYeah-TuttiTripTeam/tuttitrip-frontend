import type { ReactNode } from 'react'
import type { Proposal } from '@/api/queries/proposals'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { ProposalStatusChip } from './proposal-status'

interface ProposalCardProps {
  proposal: Proposal
  /** The host may send the newest plan again. */
  canResend: boolean
  resending: boolean
  onResend: () => void
  /** Why sending failed, if it did. */
  sendError: string | null
  /** The answer form, the list of answers and the calendar card. */
  children: ReactNode
}

/** The open proposal: its status, the tally and the people who cannot answer in the app. */
export function ProposalCard({
  proposal,
  canResend,
  resending,
  onResend,
  sendError,
  children,
}: ProposalCardProps) {
  const { tally, status, profiles_without_account: withoutAccount } = proposal
  const outdated = status === 'outdated'

  return (
    <section
      aria-labelledby="proposal-title"
      className="flex flex-col gap-4 rounded-lg border p-4 md:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <h2 id="proposal-title" className="font-heading font-semibold text-base">
            {m.proposal_title()}
          </h2>
          <p className="text-muted-foreground text-sm">
            {m.proposal_sent({
              version: proposal.plan_version,
              name: proposal.sent_by_name,
              date: formatDate(proposal.sent_at),
              time: formatTime(proposal.sent_at),
            })}
          </p>
        </div>
        <ProposalStatusChip status={status} />
      </div>

      {outdated ? (
        <div role="status" className="flex flex-col items-start gap-3 text-sm">
          <p className="leading-relaxed">
            {canResend ? m.proposal_outdated_host() : m.proposal_outdated_member()}
          </p>
          {canResend && (
            <Button className="h-11 rounded-full px-5" disabled={resending} onClick={onResend}>
              {resending ? m.proposal_sending() : m.proposal_send_again()}
            </Button>
          )}
          {sendError && (
            <p role="alert" className="text-destructive">
              {sendError}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm tabular-nums" aria-live="polite">
          {m.proposal_tally({
            approvals: tally.approvals,
            members: tally.members,
            rejections: tally.rejections,
            comments: tally.comments,
            waiting: tally.waiting,
          })}
        </p>
      )}

      {withoutAccount.length > 0 && (
        <p className="text-muted-foreground text-sm leading-relaxed">
          {m.proposal_without_account({
            names: withoutAccount.map((profile) => profile.display_name).join(', '),
          })}
        </p>
      )}

      {children}
    </section>
  )
}
