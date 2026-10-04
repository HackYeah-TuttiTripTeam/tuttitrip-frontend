import { Check, Clock, TriangleAlert, X } from '@keyline-icons/react'
import type { ReactNode } from 'react'
import type { ProposalStatus } from '@/api/queries/proposals'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

const LABELS: Record<ProposalStatus, () => string> = {
  pending: m.proposal_status_pending,
  approved: m.proposal_status_approved,
  rejected: m.proposal_status_rejected,
  outdated: m.proposal_status_outdated,
}

const ICONS: Record<ProposalStatus, ReactNode> = {
  pending: <Clock />,
  approved: <Check />,
  rejected: <X />,
  outdated: <TriangleAlert />,
}

const TONES: Record<ProposalStatus, string> = {
  pending: 'border-border text-muted-foreground',
  approved: 'border-primary text-primary',
  rejected: 'border-destructive text-destructive',
  outdated: 'border-border text-foreground',
}

/** The status of the proposal as a whole: an icon and a word, never colour alone. */
export function ProposalStatusChip({ status }: { status: ProposalStatus }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 font-medium text-xs [&_svg]:size-3.5',
        TONES[status],
      )}
    >
      <span aria-hidden="true">{ICONS[status]}</span>
      {LABELS[status]()}
    </span>
  )
}
