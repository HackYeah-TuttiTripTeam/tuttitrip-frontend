import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface DeleteExpenseConfirmProps {
  title: string
  isDeleting: boolean
  /** Why the delete failed, when it did. */
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteExpenseConfirm({
  title,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: DeleteExpenseConfirmProps) {
  return (
    <div className="flex flex-col gap-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <p className="text-sm leading-relaxed">{m.expense_delete_body({ title })}</p>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Button
          variant="destructive"
          disabled={isDeleting}
          onClick={onConfirm}
          className="h-11 md:h-9"
        >
          {isDeleting ? m.expense_delete_deleting() : m.expense_delete_confirm()}
        </Button>
        <Button variant="outline" disabled={isDeleting} onClick={onCancel} className="h-11 md:h-9">
          {m.action_cancel()}
        </Button>
      </div>
    </div>
  )
}
