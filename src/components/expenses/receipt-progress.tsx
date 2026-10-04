import { CloudOff, Loader, TriangleAlert } from '@keyline-icons/react'
import { Button } from '@/components/ui/button'
import type { ReceiptFailure } from '@/lib/receipt-failure'
import { m } from '@/paraglide/messages'

const FAILURE_BODY: Record<ReceiptFailure, () => string> = {
  offline: m.receipt_failure_offline,
  unreadable: m.receipt_failure_unreadable,
  too_large: m.receipt_failure_too_large,
  type_not_allowed: m.receipt_failure_type,
  too_many: m.receipt_failure_too_many,
  unavailable: m.receipt_failure_unavailable,
  forbidden: m.receipt_failure_forbidden,
  closed: m.expense_error_closed,
  unknown: m.receipt_failure_unknown,
}

/** Failures a second try can fix; for the others only a new photo or typing it by hand helps. */
const RETRYABLE: readonly ReceiptFailure[] = ['offline', 'unavailable', 'unknown']

interface ReceiptProgressProps {
  phase: 'preparing' | 'uploading' | 'reading'
  /** 0..100 from the job, null before the worker reports. */
  percent: number | null
}

/** The steps before the card: shrinking, sending and reading, with a bar once the worker reports. */
export function ReceiptProgress({ phase, percent }: ReceiptProgressProps) {
  const label =
    phase === 'preparing'
      ? m.receipt_preparing()
      : phase === 'uploading'
        ? m.receipt_uploading()
        : m.receipt_reading()
  return (
    <div role="status" className="flex flex-col gap-3 py-4">
      <p className="flex items-center gap-2 text-sm">
        <Loader aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
        {label}
      </p>
      {phase === 'reading' && percent !== null && (
        <progress
          max={100}
          value={percent}
          aria-label={m.receipt_reading()}
          className="h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
        />
      )}
    </div>
  )
}

interface ReceiptFailedProps {
  failure: ReceiptFailure
  onRetry: () => void
  onManual: () => void
  onClose: () => void
}

/** A receipt that did not make it: why, and the way on (try again, type it, close). */
export function ReceiptFailed({ failure, onRetry, onManual, onClose }: ReceiptFailedProps) {
  const Icon = failure === 'offline' ? CloudOff : TriangleAlert
  return (
    <div className="flex flex-col gap-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div role="alert" className="flex items-start gap-3">
        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm">{m.receipt_failed_title()}</p>
          <p className="text-muted-foreground text-sm leading-relaxed">{FAILURE_BODY[failure]()}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {RETRYABLE.includes(failure) && (
          <Button onClick={onRetry} className="h-11 md:h-9">
            {m.action_retry()}
          </Button>
        )}
        <Button variant="outline" onClick={onManual} className="h-11 md:h-9">
          {m.receipt_enter_manually()}
        </Button>
        <Button variant="ghost" onClick={onClose} className="h-11 md:h-9">
          {m.action_cancel()}
        </Button>
      </div>
    </div>
  )
}
