import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface DeleteTripConfirmProps {
  tripName: string
  isDeleting: boolean
  failed: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Body of the delete confirmation: what is lost, then the destructive action. */
export function DeleteTripConfirm({
  tripName,
  isDeleting,
  failed,
  onConfirm,
  onCancel,
}: DeleteTripConfirmProps) {
  return (
    <div className="flex flex-col gap-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <p className="text-sm leading-relaxed">{m.trip_delete_body({ name: tripName })}</p>
      {failed && (
        <p role="alert" className="text-destructive text-sm">
          {m.trip_delete_failed()}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Button
          variant="destructive"
          disabled={isDeleting}
          onClick={onConfirm}
          className="h-11 md:h-9"
        >
          {isDeleting ? m.trip_delete_deleting() : m.trip_delete_confirm()}
        </Button>
        <Button variant="outline" disabled={isDeleting} onClick={onCancel} className="h-11 md:h-9">
          {m.action_cancel()}
        </Button>
      </div>
    </div>
  )
}
