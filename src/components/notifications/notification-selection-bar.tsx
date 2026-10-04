import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface NotificationSelectionBarProps {
  /** Rows ticked on this page. */
  selected: number
  /** Rows on this page. */
  pageSize: number
  /** Rows matching the filters, on every page. */
  total: number
  /** The whole filtered set is meant, not just the ticked rows. */
  allMatching: boolean
  busy: boolean
  onSelectAllMatching: () => void
  onClear: () => void
  onMark: (read: boolean) => void
}

/**
 * Appears once something is ticked. The banner offers to extend a full page to every match; the
 * action bar sits above the bottom bar on phones. The count is announced politely.
 */
export function NotificationSelectionBar({
  selected,
  pageSize,
  total,
  allMatching,
  busy,
  onSelectAllMatching,
  onClear,
  onMark,
}: NotificationSelectionBarProps) {
  if (selected === 0) return null
  const offerAll = !allMatching && selected === pageSize && total > pageSize

  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-background shadow-lg md:static md:z-auto md:rounded-lg md:border md:shadow-none">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 md:px-3 md:py-2">
        <p className="text-sm" aria-live="polite">
          {allMatching
            ? m.notif_selected_all_matching({ count: total })
            : m.notif_selected_page({ count: selected })}
          {offerAll && (
            <>
              {' '}
              <Button
                variant="link"
                onClick={onSelectAllMatching}
                className="h-auto min-h-11 p-0 align-baseline md:min-h-0"
              >
                {m.notif_select_all_matching({ total })}
              </Button>
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => onMark(true)} className="h-11 md:h-9">
            {m.notif_mark_read()}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => onMark(false)}
            className="h-11 md:h-9"
          >
            {m.notif_mark_unread()}
          </Button>
          <Button variant="ghost" onClick={onClear} className="h-11 md:h-9">
            {m.notif_clear_selection()}
          </Button>
        </div>
      </div>
    </div>
  )
}
