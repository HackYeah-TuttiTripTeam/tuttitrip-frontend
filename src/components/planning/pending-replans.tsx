import type { Replan } from '@/api/queries/replan'
import { ApprovalCard } from '@/components/shared/approval-card'
import { formatDayMonth } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { ReplanDiff } from './replan-diff'

interface PendingReplansProps {
  replans: Replan[]
  busyId: string | null
  error: string | null
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

/** The host's list: changes of members that touch other people and wait for a decision. */
export function PendingReplans({
  replans,
  busyId,
  error,
  onApprove,
  onReject,
}: PendingReplansProps) {
  if (replans.length === 0) return null
  return (
    <section aria-labelledby="pending-replans" className="flex flex-col gap-3">
      <h2 id="pending-replans" className="font-medium text-base">
        {m.replan_pending_title({ count: replans.length })}
      </h2>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {replans.map((replan) => (
        <ApprovalCard
          key={replan.id}
          title={m.replan_pending_card({ day: replan.day })}
          meta={m.replan_pending_meta({
            name: replan.requested_by_name ?? m.replan_someone(),
            date: formatDayMonth(replan.created_at),
          })}
          approveLabel={m.replan_approve()}
          rejectLabel={m.replan_reject()}
          busy={busyId === replan.id}
          onApprove={() => onApprove(replan.id)}
          onReject={() => onReject(replan.id)}
        >
          <ReplanDiff changes={replan.changes} />
        </ApprovalCard>
      ))}
    </section>
  )
}
