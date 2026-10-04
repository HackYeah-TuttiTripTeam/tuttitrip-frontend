import { CalendarPlus, Download } from '@keyline-icons/react'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface CalendarCardProps {
  /** Every member with an account approved this version: only then the file exists. */
  approved: boolean
  planVersion: number
  fileName: string
  open: boolean
  isDesktop: boolean
  pending: boolean
  done: boolean
  /** A sentence about why the download failed. */
  error: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

/** "Add to calendar": a button, and a confirmation card before the `.ics` file is saved. */
export function CalendarCard({
  approved,
  planVersion,
  fileName,
  open,
  isDesktop,
  pending,
  done,
  error,
  onOpenChange,
  onConfirm,
}: CalendarCardProps) {
  return (
    <section aria-labelledby="calendar-title" className="flex flex-col gap-2">
      <h3 id="calendar-title" className="font-medium text-sm">
        {m.calendar_title()}
      </h3>
      <div className="flex flex-col items-start gap-2">
        <Button
          type="button"
          variant={approved ? 'default' : 'outline'}
          className="h-11 rounded-full px-5"
          disabled={!approved}
          aria-describedby="calendar-hint"
          onClick={() => onOpenChange(true)}
        >
          <CalendarPlus aria-hidden="true" />
          {m.calendar_add()}
        </Button>
        <p id="calendar-hint" className="text-muted-foreground text-sm leading-relaxed">
          {approved ? m.calendar_hint_ready() : m.calendar_hint_locked()}
        </p>
      </div>

      <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        isDesktop={isDesktop}
        title={m.calendar_card_title()}
        description={m.calendar_card_description({ version: planVersion })}
      >
        <div className="flex flex-col gap-4 pb-6 text-sm">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted-foreground leading-relaxed">
            <li>{m.calendar_card_events()}</li>
            <li>{m.calendar_card_no_sync()}</li>
            <li>{m.calendar_card_phone()}</li>
          </ul>
          <p className="font-medium tabular-nums">{m.calendar_card_file({ name: fileName })}</p>
          {done && (
            <p role="status" className="text-primary">
              {m.calendar_done()}
            </p>
          )}
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="h-11 rounded-full px-5"
              disabled={pending}
              onClick={onConfirm}
            >
              <Download aria-hidden="true" />
              {pending ? m.calendar_downloading() : m.calendar_download()}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full px-5"
              onClick={() => onOpenChange(false)}
            >
              {done ? m.action_close() : m.action_cancel()}
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </section>
  )
}
