import type { Notification, NotificationMark } from '@/api/queries/notifications'

/**
 * The unread counter right after a mark, before the server answers. Only the cases the cache can
 * settle are guessed (the ids are in a loaded page, or everything unread is marked); any other
 * filter returns undefined and waits for the server. Never below zero.
 */
export function guessUnreadCount(
  current: number,
  mark: NotificationMark,
  loaded: readonly Notification[],
): number | undefined {
  if (mark.ids) {
    const ids = new Set(mark.ids)
    const changed = loaded.filter(
      (item) => ids.has(item.id) && (item.read_at === null) === mark.read,
    ).length
    // Ids missing from every loaded page may still change the count: leave it to the server.
    const known = new Set(loaded.map((item) => item.id))
    if (mark.ids.some((id) => !known.has(id))) return undefined
    return Math.max(0, current + (mark.read ? -changed : changed))
  }
  const { read, ...rest } = mark.filters ?? {}
  const everyUnread = Object.values(rest).every(
    (value) => value == null || (Array.isArray(value) && value.length === 0),
  )
  return mark.read && everyUnread && read !== true ? 0 : undefined
}
