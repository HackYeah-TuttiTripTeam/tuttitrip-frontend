import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { m } from '@/paraglide/messages'

interface DeleteTripDialogProps {
  /** Name of the trip being deleted; null keeps the dialog closed. */
  tripName: string | null
  isDesktop: boolean
  pending: boolean
  failed: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Asks before a trip is deleted for good: names the trip and what goes with it. */
export function DeleteTripDialog({
  tripName,
  isDesktop,
  pending,
  failed,
  onConfirm,
  onCancel,
}: DeleteTripDialogProps) {
  return (
    <ConfirmDialog
      open={tripName !== null}
      isDesktop={isDesktop}
      title={m.trip_delete_title()}
      description={m.trip_delete_body({ name: tripName ?? '' })}
      confirmLabel={m.trip_delete_confirm()}
      pending={pending}
      error={failed ? m.trip_delete_failed() : null}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
