/**
 * Talk between the tabs of one browser, over a BroadcastChannel (absent: every tab works alone).
 * Every tab holds its own stream, so a notification would pop up as a toast in each visible tab
 * and a mark in one tab would leave the others stale.
 */
type Message = { kind: 'toast'; id: string } | { kind: 'marked' }

const NAME = 'tuttitrip-notifications'
const SEEN_MS = 30_000

let channel: BroadcastChannel | null | undefined
const seenToasts = new Map<string, number>()
const markedListeners = new Set<() => void>()

function open(): BroadcastChannel | null {
  if (channel !== undefined) return channel
  channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(NAME)
  if (channel) {
    channel.onmessage = ({ data }: MessageEvent<Message>) => {
      if (data.kind === 'toast') seenToasts.set(data.id, Date.now())
      else for (const listener of markedListeners) listener()
    }
  }
  return channel
}

const wasSeen = (id: string) => {
  const at = seenToasts.get(id)
  return at !== undefined && Date.now() - at < SEEN_MS
}

/**
 * True for the first tab that asks about this notification: it shows the toast, the others see the
 * claim and stay quiet. Two tabs asking in the same instant may both show it; that is rare and harmless.
 */
export function claimToast(id: string): boolean {
  const port = open()
  if (wasSeen(id)) return false
  seenToasts.set(id, Date.now())
  port?.postMessage({ kind: 'toast', id } satisfies Message)
  return true
}

/** Tells the other tabs that notifications were marked, so they refetch. */
export function announceMarked(): void {
  open()?.postMessage({ kind: 'marked' } satisfies Message)
}

/** Runs `listener` when another tab marked notifications. Returns the unsubscribe. */
export function onMarkedElsewhere(listener: () => void): () => void {
  open()
  markedListeners.add(listener)
  return () => markedListeners.delete(listener)
}
