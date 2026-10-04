import { Bell } from '@keyline-icons/react'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface NotificationBellProps extends Omit<ComponentProps<typeof Button>, 'children'> {
  unread: number
}

/** The bell with the unread count; `99+` above 99. The label carries the count for screen readers. */
export function NotificationBell({ unread, ...props }: NotificationBellProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={unread > 0 ? m.notif_bell_label_unread({ count: unread }) : m.notif_bell_label()}
      className="relative size-11 md:size-9"
      {...props}
    >
      <Bell className="size-5" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-semibold text-[0.625rem] text-primary-foreground tabular-nums leading-none md:top-0.5 md:right-0"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Button>
  )
}
