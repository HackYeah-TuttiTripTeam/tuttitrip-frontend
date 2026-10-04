import type { Notification, NotificationAction } from '@/api/queries/notifications'
import type { TripTab } from '@/lib/trip-tabs'
import { m } from '@/paraglide/messages'

/** Where an action leads: a tab of the notification's trip. */
export interface ActionTarget {
  tripId: string
  tab: TripTab
}

export interface ResolvedAction {
  code: NotificationAction['code']
  label: string
  target: ActionTarget
}

/**
 * The actions this frontend can carry out. `approve_*` and `reject_*` wait for their endpoints
 * (backend#77 and #78); until then they are skipped, like any code the client does not know.
 */
const NAVIGATION: Partial<
  Record<NotificationAction['code'], { tab: TripTab; label: () => string }>
> = {
  open_trip: { tab: 'interview', label: m.notif_action_open_trip },
  open_people: { tab: 'people', label: m.notif_action_open_people },
  open_plan: { tab: 'plan', label: m.notif_action_open_plan },
}

export function resolveActions(notification: Pick<Notification, 'actions' | 'trip_id'>) {
  const actions: ResolvedAction[] = []
  for (const action of notification.actions) {
    const known = NAVIGATION[action.code]
    const tripId = action.params?.trip_id ?? notification.trip_id
    if (known && tripId) {
      actions.push({
        code: action.code,
        label: known.label(),
        target: { tripId, tab: known.tab },
      })
    }
  }
  return actions
}
