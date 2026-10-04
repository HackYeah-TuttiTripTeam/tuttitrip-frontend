import { describe, expect, it, vi } from 'vitest'
import { notification } from '@/mocks/fixtures'
import {
  backoffDelay,
  openNotificationStream,
  type StreamEvent,
  type StreamOptions,
  type StreamStatus,
} from './notification-stream'

const encoder = new TextEncoder()

const bodies = new WeakMap<Response, ReadableStreamDefaultController>()

/** A response whose body arrives in the given chunks, then ends (or stays open when `hold`). */
function sse(chunks: string[], { hold = false }: { hold?: boolean } = {}) {
  let handle: ReadableStreamDefaultController | undefined
  const response = new Response(
    new ReadableStream({
      start(controller) {
        handle = controller
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        if (!hold) controller.close()
      },
    }),
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
  )
  if (handle) bodies.set(response, handle)
  return response
}

const frame = (event: string, data: unknown, id?: string) =>
  `${id ? `id: ${id}\n` : ''}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`

function setup(responses: (Response | Error)[], overrides: Partial<StreamOptions> = {}) {
  const controller = new AbortController()
  const events: StreamEvent[] = []
  const statuses: StreamStatus[] = []
  const calls: { headers: Record<string, string> }[] = []
  const queue = [...responses]
  const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
    calls.push({ headers: { ...(init?.headers as Record<string, string>) } })
    const next = queue.shift()
    if (!next) {
      // Nothing left to serve: the test is over.
      controller.abort()
      throw new Error('no more responses')
    }
    if (next instanceof Error) throw next
    // Like a real fetch: closing the signal errors the body that is still open.
    init?.signal?.addEventListener('abort', () => {
      try {
        bodies.get(next)?.error(new DOMException('aborted', 'AbortError'))
      } catch {
        // Already closed.
      }
    })
    return next
  })
  const done = openNotificationStream({
    getAuthorization: async () => 'Bearer token-1',
    refreshAuthorization: async () => 'Bearer token-2',
    acceptLanguage: () => 'pl',
    onEvent: (event) => events.push(event),
    onStatus: (status) => statuses.push(status),
    signal: controller.signal,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    baseUrl: 'http://localhost',
    sleep: async () => undefined,
    ...overrides,
  })
  return { controller, events, statuses, calls, done, fetchImpl }
}

describe('openNotificationStream', () => {
  it('sends the headers and puts events together from chunks cut in the middle of a line', async () => {
    const live = notification({ id: 'n-1' })
    const text =
      frame('ready', { unread: 3 }) +
      frame('notification', live, 'n-1') +
      frame('resync', { reason: 'x' })
    // Cut inside "event:" and inside the JSON.
    const chunks = [text.slice(0, 9), text.slice(9, 40), text.slice(40, 77), text.slice(77)]
    const { events, statuses, calls, done, controller } = setup([
      sse(chunks),
      sse([], { hold: true }),
    ])
    await vi.waitFor(() => expect(events).toHaveLength(3))
    controller.abort()
    await done

    expect(events).toEqual([
      { type: 'ready', unread: 3 },
      { type: 'notification', notification: live },
      { type: 'resync' },
    ])
    expect(statuses.slice(0, 2)).toEqual(['connecting', 'open'])
    expect(calls[0]?.headers).toMatchObject({
      Authorization: 'Bearer token-1',
      Accept: 'text/event-stream',
      'Accept-Language': 'pl',
    })
  })

  it('goes to polling on a 503, reconnects and resumes from the last notification', async () => {
    const live = notification({ id: 'n-7' })
    const { statuses, calls, events, done, controller } = setup([
      new Response('down', { status: 503 }),
      sse([frame('ready', { unread: 1 }), frame('notification', live, 'n-7')]),
      sse([frame('ready', { unread: 1 })], { hold: true }),
    ])
    await vi.waitFor(() => expect(events.filter((e) => e.type === 'ready')).toHaveLength(2))
    controller.abort()
    await done

    expect(statuses).toContain('polling')
    expect(statuses.at(-1)).toBe('open')
    expect(calls[1]?.headers['Last-Event-ID']).toBeUndefined()
    expect(calls[2]?.headers['Last-Event-ID']).toBe('n-7')
  })

  it('retries a 401 once with a refreshed token', async () => {
    const { statuses, calls, done, controller } = setup([
      new Response('no', { status: 401 }),
      sse([frame('ready', { unread: 0 })], { hold: true }),
    ])
    await vi.waitFor(() => expect(statuses).toContain('open'))
    controller.abort()
    await done
    expect(calls.map((call) => call.headers.Authorization)).toEqual([
      'Bearer token-1',
      'Bearer token-2',
    ])
  })

  it('stops for good on a second 401 and falls back to polling', async () => {
    const { statuses, fetchImpl, done } = setup([
      new Response('no', { status: 401 }),
      new Response('no', { status: 401 }),
    ])
    await done
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(statuses.at(-1)).toBe('polling')
  })

  it('does not connect without a token', async () => {
    const { statuses, fetchImpl, done } = setup([], { getAuthorization: async () => undefined })
    await done
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(statuses).toEqual(['connecting', 'polling'])
  })

  it('reports nothing after it was closed', async () => {
    const { events, statuses, done, controller } = setup([
      sse([frame('ready', { unread: 0 })], { hold: true }),
    ])
    await vi.waitFor(() => expect(events).toHaveLength(1))
    controller.abort()
    await done
    const seen = statuses.length
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(statuses).toHaveLength(seen)
  })

  it('ignores a malformed event instead of failing', async () => {
    const { events, done, controller } = setup([
      sse(['event: ready\ndata: not json\n\n', frame('ready', { unread: 2 })], { hold: true }),
    ])
    await vi.waitFor(() => expect(events).toHaveLength(1))
    controller.abort()
    await done
    expect(events).toEqual([{ type: 'ready', unread: 2 }])
  })
})

describe('backoffDelay', () => {
  it('doubles from one second up to thirty, with jitter that only shortens it', () => {
    expect(backoffDelay(0, () => 1)).toBe(1_000)
    expect(backoffDelay(0, () => 0)).toBe(500)
    expect(backoffDelay(3, () => 1)).toBe(8_000)
    expect(backoffDelay(10, () => 1)).toBe(30_000)
    expect(backoffDelay(10, () => 0)).toBe(15_000)
  })
})
