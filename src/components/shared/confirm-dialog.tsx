import { useState } from 'react'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { m } from '@/paraglide/messages'

interface ConfirmDialogProps {
  open: boolean
  isDesktop: boolean
  title: string
  description: string
  confirmLabel: string
  /** Disables both buttons and shows the pending label while the request runs. */
  pending: boolean
  /** The API's answer when the action failed; the dialog stays open to show it. */
  error: string | null
  /**
   * Destructive actions that cannot be undone ask to type this text (an e-mail, a name) first.
   * The button stays disabled until the input matches, ignoring case and surrounding spaces.
   */
  typeToConfirm?: { expected: string; label: string }
  onConfirm: () => void
  onCancel: () => void
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** A destructive action asks before it runs: what happens, then the red button and a way out. */
export function ConfirmDialog({
  open,
  isDesktop,
  title,
  description,
  confirmLabel,
  pending,
  error,
  typeToConfirm,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const blocked = typeToConfirm ? !same(typed, typeToConfirm.expected) : false

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setTyped('')
          onCancel()
        }
      }}
      isDesktop={isDesktop}
      title={title}
      description={description}
    >
      <form
        className="flex flex-col gap-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault()
          if (!blocked && !pending) onConfirm()
        }}
      >
        {typeToConfirm && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-typed">{typeToConfirm.label}</Label>
            <Input
              id="confirm-typed"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="h-11 md:h-9"
            />
          </div>
        )}
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            type="submit"
            variant="destructive"
            disabled={pending || blocked}
            className="h-11 flex-1 md:h-9"
          >
            {pending ? m.action_working() : confirmLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setTyped('')
              onCancel()
            }}
            className="h-11 flex-1 md:h-9"
          >
            {m.action_cancel()}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  )
}
