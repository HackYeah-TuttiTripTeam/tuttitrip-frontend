import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface DeleteRoleConfirmProps {
  isDeleting: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

/** Body of the delete confirmation: what is lost, then the destructive action. */
export function DeleteRoleConfirm({
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: DeleteRoleConfirmProps) {
  return (
    <div className="flex flex-col gap-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <p className="text-sm leading-relaxed">{m.perm_role_delete_confirm_body()}</p>
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
          {isDeleting ? m.perm_role_deleting() : m.perm_role_delete()}
        </Button>
        <Button variant="outline" disabled={isDeleting} onClick={onCancel} className="h-11 md:h-9">
          {m.action_cancel()}
        </Button>
      </div>
    </div>
  )
}
