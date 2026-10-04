import {
  Banknote,
  Bell,
  CalendarCheck,
  ClipboardCheck,
  MapPinX,
  UserPlus,
} from '@keyline-icons/react'
import type { ComponentType } from 'react'
import type { NotificationIconName } from '@/lib/notification-copy'
import { cn } from '@/lib/utils'

const ICONS: Record<NotificationIconName, ComponentType<{ className?: string }>> = {
  member_joined: UserPlus,
  veto_added: MapPinX,
  proposal_waiting: ClipboardCheck,
  budget_approval_waiting: Banknote,
  plan_ready: CalendarCheck,
  unknown: Bell,
}

/** The icon of a notification type in a quiet tile; decorative, the title says the same. */
export function NotificationIcon({
  name,
  className,
}: {
  name: NotificationIconName
  className?: string
}) {
  const Icon = ICONS[name]
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground',
        className,
      )}
    >
      <Icon className="size-4.5" />
    </span>
  )
}
