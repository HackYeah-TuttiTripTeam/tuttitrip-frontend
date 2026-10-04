import { CircleAlert } from '@keyline-icons/react'
import { m } from '@/paraglide/messages'

/** "Check this" next to a field the receipt reader was unsure about: an icon and words, not only a color. */
export function UncertainMark() {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-warning-soft px-1.5 py-0.5 font-medium text-warning-ink text-xs">
      <CircleAlert aria-hidden="true" className="size-3.5" />
      {m.receipt_check_field()}
    </span>
  )
}
