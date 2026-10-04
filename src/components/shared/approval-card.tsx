import { cn } from 'cn'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export interface ApprovalFact {
  label: string
  value: ReactNode
  /** Numbers and amounts: a fixed-width face so columns of figures line up. */
  mono?: boolean
}

export interface ApprovalAction {
  key: string
  label: string
  onClick: () => void
}

interface ApprovalCardProps {
  /** What the decision changes: one row each. */
  facts: ApprovalFact[]
  /** Anything that needs more room than a row: an alternative, a warning. */
  children?: ReactNode
  /** The ways to say yes ("Zatwierdź", or one "Otwórz" per platform). */
  approve: ApprovalAction[]
  rejectLabel?: string
  onReject?: () => void
  /** A way out that decides nothing ("Później"). */
  laterLabel?: string
  onLater?: () => void
  busy?: boolean
  error?: string | null
  /** The reader may not decide: no buttons, this says who does. */
  readOnlyNote?: string
}

/**
 * The pattern for anything that touches money or leaves the app: show what happens (rows of
 * facts), then ask. The title belongs to the surrounding modal. Used for the budget overrun and for
 * opening a lodging search.
 */
export function ApprovalCard({
  facts,
  children,
  approve,
  rejectLabel,
  onReject,
  laterLabel,
  onLater,
  busy = false,
  error,
  readOnlyNote,
}: ApprovalCardProps) {
  return (
    <div className="flex flex-col gap-4 pb-4">
      <dl className="flex flex-col divide-y">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
          >
            <dt className="text-muted-foreground text-sm">{fact.label}</dt>
            <dd
              className={cn(
                'font-medium text-sm sm:text-right',
                fact.mono && 'font-mono tabular-nums',
              )}
            >
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
      {children}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {readOnlyNote ? (
        <p className="rounded-lg bg-muted px-4 py-3 text-sm leading-relaxed">{readOnlyNote}</p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          {approve.map((action) => (
            <Button
              key={action.key}
              className="h-11 flex-1 rounded-full"
              disabled={busy}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
          {rejectLabel && onReject && (
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-full"
              disabled={busy}
              onClick={onReject}
            >
              {rejectLabel}
            </Button>
          )}
          {laterLabel && onLater && (
            <Button
              variant="ghost"
              className="h-11 flex-1 rounded-full"
              disabled={busy}
              onClick={onLater}
            >
              {laterLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
