import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface SettlementStateConfirmProps {
  /** What the host is about to do. */
  mode: 'close' | 'reopen'
  isPending: boolean
  /** Why the write failed, when it did. */
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

/** The host's confirmation before the settlement is frozen or opened again. */
export function SettlementStateConfirm({
  mode,
  isPending,
  error,
  onConfirm,
  onCancel,
}: SettlementStateConfirmProps) {
  const closing = mode === 'close'
  return (
    <div className="flex flex-col gap-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <p className="text-sm leading-relaxed">
        {closing ? m.settlement_close_body() : m.settlement_reopen_body()}
      </p>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Button disabled={isPending} onClick={onConfirm} className="h-11 md:h-9">
          {closing ? m.settlement_close_confirm() : m.settlement_reopen_confirm()}
        </Button>
        <Button variant="outline" disabled={isPending} onClick={onCancel} className="h-11 md:h-9">
          {m.action_cancel()}
        </Button>
      </div>
    </div>
  )
}
