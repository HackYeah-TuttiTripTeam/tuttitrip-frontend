import { EventSourceParserStream } from 'eventsource-parser/stream'
import type { Notification } from '@/api/queries/notifications'

/** `connecting` until the first `ready`, `open` while events flow, `polling` when the stream is down. */
export type StreamStatus = 'connecting' | 'open' | 'polling'

export type StreamEvent =
  | { type: 'ready'; unread: number }
  | { type: 'notification'; notification: Notification }
  | { type: 'resync' }

export interface StreamOptions {
  /** The `Authorization` header value, or undefined for a guest (then there is nothing to open). */
  getAuthorization: () => Promise<string | undefined>
  /** Called after a 401 to get a header with a new token; the stream gives up if that fails too. */
  refreshAuthorization: () => Promise<string | undefined>
  acceptLanguage: () => string
  onEvent: (event: StreamEvent) => void
  onStatus: (status: StreamStatus) => void
  /** Closing the stream: logout, unmount. No event or status is reported after it fires. */
  signal: AbortSignal
  fetchImpl?: typeof fetch
  /** Where the API lives; the browser's origin by default. */
  baseUrl?: string
  /** Replaceable for tests: waits `ms`, ends early when the signal fires. */
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>
}

const PATH = '/api/v1/notifications/stream'
const MIN_DELAY = 1_000
const MAX_DELAY = 30_000
/** A connection that lasted less than this and ended counts as a failure, so a server that closes at once is not hammered. */
const MIN_HEALTHY_MS = 2_000

const sleepUnlessAborted = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })

/** 1 s, 2 s, 4 s ... up to 30 s, each with up to half of it shaved off by jitter. */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(MAX_DELAY, MIN_DELAY * 2 ** attempt)
  return Math.round(base * (0.5 + random() * 0.5))
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** One SSE event to ours; anything unknown or malformed is dropped, never thrown at the loop. */
function parseEvent(name: string | undefined, data: string): StreamEvent | null {
  try {
    const body: unknown = JSON.parse(data)
    if (name === 'resync') return { type: 'resync' }
    if (name === 'ready' && isRecord(body) && typeof body.unread === 'number') {
      return { type: 'ready', unread: body.unread }
    }
    if (name === 'notification' && isRecord(body) && typeof body.id === 'string') {
      return { type: 'notification', notification: body as unknown as Notification }
    }
  } catch {
    // A broken payload costs one event; the next resync repairs the lists.
  }
  return null
}

/**
 * Keeps one connection to the notification stream until `signal` fires. `EventSource` cannot send
 * an `Authorization` header, so the body is read with `fetch` and parsed by eventsource-parser.
 *
 * - A 401 gets one retry with a refreshed token; a second one stops the stream (status `polling`).
 * - Other failures reconnect with backoff, resuming from the last notification id (`Last-Event-ID`).
 * - The server closing the stream (token expiry, the 30-minute limit) reconnects at once.
 */
export async function openNotificationStream(options: StreamOptions): Promise<void> {
  const { signal, onStatus, onEvent } = options
  const doFetch = options.fetchImpl ?? ((...args) => fetch(...args))
  const sleep = options.sleep ?? sleepUnlessAborted
  const url = new URL(PATH, options.baseUrl ?? globalThis.location?.origin ?? 'http://localhost')
  const report = (status: StreamStatus) => {
    if (!signal.aborted) onStatus(status)
  }
  let lastEventId: string | undefined
  let failures = 0
  let refreshedAfter401 = false

  while (!signal.aborted) {
    report('connecting')
    let authorization = await options.getAuthorization()
    if (signal.aborted) return
    if (!authorization) return report('polling')
    const startedAt = Date.now()
    try {
      const request = (value: string) =>
        doFetch(url, {
          signal,
          headers: {
            Authorization: value,
            Accept: 'text/event-stream',
            'Accept-Language': options.acceptLanguage(),
            ...(lastEventId && { 'Last-Event-ID': lastEventId }),
          },
        })
      let response = await request(authorization)
      if (response.status === 401 && !refreshedAfter401) {
        refreshedAfter401 = true
        authorization = await options.refreshAuthorization()
        if (signal.aborted) return
        if (authorization) response = await request(authorization)
      }
      if (response.status === 401) return report('polling')
      if (!response.ok || !response.body) throw new Error(`Stream answered ${response.status}`)

      const events = response.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new EventSourceParserStream())
      for await (const message of events) {
        if (signal.aborted) return
        const event = parseEvent(message.event, message.data)
        if (!event) continue
        if (event.type === 'ready') {
          failures = 0
          refreshedAfter401 = false
          report('open')
        }
        if (event.type === 'notification' && message.id) lastEventId = message.id
        onEvent(event)
      }
    } catch (error) {
      if (signal.aborted) return
      console.warn('Notification stream failed', error)
    }
    if (signal.aborted) return
    if (Date.now() - startedAt >= MIN_HEALTHY_MS) {
      // The server ended a healthy stream (token expiry, time limit): connect again at once.
      failures = 0
      continue
    }
    report('polling')
    await sleep(backoffDelay(failures), signal)
    failures += 1
  }
}
