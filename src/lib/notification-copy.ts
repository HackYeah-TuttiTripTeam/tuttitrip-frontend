import type { Notification, NotificationsSearch } from '@/api/queries/notifications'
import { m } from '@/paraglide/messages'

/**
 * The types the backend sends (`NotificationType`). The API schema keeps `type` an open string, so
 * the list lives here: a new entry makes every `switch` below fail to compile until it has text.
 */
export const NOTIFICATION_TYPES = [
  'member_joined',
  'veto_added',
  'proposal_waiting',
  'budget_approval_waiting',
  'plan_ready',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

/** The sort keys and read filters of the history page (the API's `NotificationSort`, plus `all`). */
export const NOTIFICATION_SORT_KEYS = [
  'created_at',
  'type',
] as const satisfies readonly NotificationsSearch['sort'][]
export type NotificationSortKey = (typeof NOTIFICATION_SORT_KEYS)[number]
export const NOTIFICATION_READ_FILTERS = ['all', 'unread', 'read'] as const
export type NotificationReadFilter = (typeof NOTIFICATION_READ_FILTERS)[number]

/** The icon of a type, resolved to a component in components/notifications. */
export type NotificationIconName = NotificationType | 'unknown'

export interface NotificationCopy {
  title: string
  body: string
  icon: NotificationIconName
}

export const isNotificationType = (value: string): value is NotificationType =>
  NOTIFICATION_TYPES.some((type) => type === value)

/** A non-empty param, or undefined: texts without a name read as a neutral sentence. */
const param = (params: Notification['params'], key: string): string | undefined =>
  params[key]?.trim() || undefined

function describeKnown(type: NotificationType, params: Notification['params']): NotificationCopy {
  switch (type) {
    case 'member_joined': {
      const name = param(params, 'member_name')
      return {
        title: m.notif_member_joined_title(),
        body: name ? m.notif_member_joined_body({ name }) : m.notif_member_joined_body_anon(),
        icon: type,
      }
    }
    case 'veto_added': {
      const place = param(params, 'place_name')
      const person = param(params, 'member_name')
      return {
        title: m.notif_veto_added_title(),
        body: !place
          ? m.notif_veto_added_body_anon()
          : person
            ? m.notif_veto_added_body_person({ place, person })
            : m.notif_veto_added_body({ place }),
        icon: type,
      }
    }
    case 'proposal_waiting': {
      const name = param(params, 'proposal_name')
      return {
        title: m.notif_proposal_waiting_title(),
        body: name ? m.notif_proposal_waiting_body({ name }) : m.notif_proposal_waiting_body_anon(),
        icon: type,
      }
    }
    case 'budget_approval_waiting': {
      const amount = param(params, 'amount')
      return {
        title: m.notif_budget_waiting_title(),
        body: amount ? m.notif_budget_waiting_body({ amount }) : m.notif_budget_waiting_body_anon(),
        icon: type,
      }
    }
    case 'plan_ready':
      return { title: m.notif_plan_ready_title(), body: m.notif_plan_ready_body(), icon: type }
  }
}

/** Title, text and icon in the language of the interface; an unknown type still reads as a notice. */
export function describeNotification({ type, params }: Pick<Notification, 'type' | 'params'>) {
  return isNotificationType(type)
    ? describeKnown(type, params)
    : ({ title: m.notif_unknown_title(), body: '', icon: 'unknown' } satisfies NotificationCopy)
}

/** Message functions, so the label is read in the language active at render time. */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, () => string> = {
  member_joined: m.notif_type_member_joined,
  veto_added: m.notif_type_veto_added,
  proposal_waiting: m.notif_type_proposal_waiting,
  budget_approval_waiting: m.notif_type_budget_approval_waiting,
  plan_ready: m.notif_type_plan_ready,
}

export const notificationTypeLabel = (type: string): string =>
  isNotificationType(type) ? NOTIFICATION_TYPE_LABELS[type]() : m.notif_type_other()
