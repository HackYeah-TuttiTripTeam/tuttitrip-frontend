import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface ApprovalCardProps {
  title: string
  /** Who asked and when: one line under the title. */
  meta?: string | undefined
  /** What would change, shown as it is. */
  children: ReactNode
  approveLabel: string
  rejectLabel: string
  /** A decision for this card is being saved. */
  busy: boolean
  onApprove: () => void
  onReject: () => void
}

/** A change waiting for the host: what it is, and the two ways to decide. One pattern for every approval. */
export function ApprovalCard({
  title,
  meta,
  children,
  approveLabel,
  rejectLabel,
  busy,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  return (
    <article className="flex flex-col gap-3 rounded-md border p-3" aria-busy={busy}>
      <header className="flex flex-col gap-0.5">
        <h3 className="font-medium text-sm">{title}</h3>
        {meta && <p className="text-muted-foreground text-xs">{meta}</p>}
      </header>
      {children}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button disabled={busy} onClick={onApprove} className="h-11 sm:flex-1 md:h-9">
          {approveLabel}
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={onReject}
          className="h-11 sm:flex-1 md:h-9"
        >
          {rejectLabel}
        </Button>
      </div>
    </article>
  )
}
