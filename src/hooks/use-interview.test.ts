// @vitest-environment jsdom
import { EventType } from '@ag-ui/client'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { EVENT_FAMILIES, FAMILY_OF } from '@/api/interview-events'
import { TRIP_ID } from '@/mocks/fixtures'
import { SESSION_ID, sseResponse } from '@/mocks/interview'
import { server } from '@/mocks/node'
import { useInterview } from './use-interview'

const AGUI = '*/api/v1/trips/:tripId/interview/agui'
const thread = SESSION_ID

/** One valid recorded run that contains every event type of AG-UI 1.0 at least once. */
const RECORDED_RUN: { type: EventType; [key: string]: unknown }[] = [
  { type: EventType.RUN_STARTED, threadId: thread, runId: 'r1' },
  { type: EventType.STEP_STARTED, stepName: 'plan' },
  { type: EventType.REASONING_START, messageId: 'th1' },
  { type: EventType.REASONING_MESSAGE_START, messageId: 'th1', role: 'reasoning' },
  { type: EventType.REASONING_MESSAGE_CONTENT, messageId: 'th1', delta: 'Najpierw miasto. ' },
  { type: EventType.REASONING_MESSAGE_END, messageId: 'th1' },
  { type: EventType.REASONING_MESSAGE_CHUNK, messageId: 'th2', delta: 'Potem daty.' },
  {
    type: EventType.REASONING_ENCRYPTED_VALUE,
    subtype: 'message',
    entityId: 'th1',
    encryptedValue: 'x',
  },
  { type: EventType.REASONING_END, messageId: 'th1' },
  { type: EventType.SUBAGENT_STARTED, subagentRunId: 's1', name: 'geocoder' },
  { type: EventType.SUBAGENT_FINISHED, subagentRunId: 's1', outcome: { type: 'success' } },
  { type: EventType.SUBAGENT_STARTED, subagentRunId: 's2', name: 'prices' },
  { type: EventType.SUBAGENT_ERROR, subagentRunId: 's2', message: 'brak danych' },
  {
    type: EventType.TOOL_CALL_START,
    toolCallId: 'c1',
    toolCallName: 'set_trip_basics',
    parentMessageId: 'a1',
  },
  { type: EventType.TOOL_CALL_ARGS, toolCallId: 'c1', delta: '{"city":"Gdańsk"}' },
  { type: EventType.TOOL_CALL_END, toolCallId: 'c1' },
  {
    type: EventType.TOOL_CALL_RESULT,
    messageId: 't1',
    toolCallId: 'c1',
    content: 'ok',
    role: 'tool',
  },
  {
    type: EventType.TOOL_CALL_CHUNK,
    toolCallId: 'c2',
    toolCallName: 'add_person',
    parentMessageId: 'a1',
    delta: '{}',
  },
  { type: EventType.STATE_SNAPSHOT, snapshot: { card: null, count: 1 } },
  { type: EventType.STATE_DELTA, delta: [{ op: 'replace', path: '/count', value: 2 }] },
  {
    type: EventType.ACTIVITY_SNAPSHOT,
    messageId: 'ac1',
    activityType: 'SEARCH',
    content: { found: 1 },
  },
  {
    type: EventType.ACTIVITY_DELTA,
    messageId: 'ac1',
    activityType: 'SEARCH',
    patch: [{ op: 'replace', path: '/found', value: 2 }],
  },
  { type: EventType.RAW, event: { provider: 'x' } },
  { type: EventType.CUSTOM, name: 'ping', value: 1 },
  { type: EventType.TEXT_MESSAGE_START, messageId: 'a1', role: 'assistant' },
  { type: EventType.TEXT_MESSAGE_CONTENT, messageId: 'a1', delta: 'Gdańsk, ' },
  { type: EventType.TEXT_MESSAGE_END, messageId: 'a1' },
  { type: EventType.TEXT_MESSAGE_CHUNK, messageId: 'a2', role: 'assistant', delta: 'trzy dni.' },
  {
    type: EventType.MESSAGES_SNAPSHOT,
    messages: [{ id: 'a3', role: 'assistant', content: 'Z migawki.' }],
  },
  { type: EventType.STEP_FINISHED, stepName: 'plan' },
  { type: EventType.RUN_FINISHED, threadId: thread, runId: 'r1' },
]

const FAILED_RUN: { type: EventType; [key: string]: unknown }[] = [
  { type: EventType.RUN_STARTED, threadId: thread, runId: 'r2' },
  { type: EventType.RUN_ERROR, message: 'Budżet wyczerpany', code: 'spend_limit' },
]

function renderInterview() {
  const onKnowledge = vi.fn()
  const onRunEnd = vi.fn()
  const hook = renderHook(() =>
    useInterview({
      tripId: TRIP_ID,
      threadId: thread,
      startSession: async () => thread,
      onKnowledge,
      onRunEnd,
    }),
  )
  return { ...hook, onKnowledge, onRunEnd }
}

describe('useInterview, a recorded stream with every AG-UI 1.0 event', () => {
  it('lists all 31 event types in 8 families, none left out', () => {
    const types = Object.values(EventType)
    expect(types).toHaveLength(31)
    expect(Object.keys(FAMILY_OF).sort()).toEqual([...types].sort())
    expect(new Set(Object.values(FAMILY_OF))).toEqual(new Set(EVENT_FAMILIES))
    // RUN_ERROR ends a run in place of RUN_FINISHED, so it comes from a second, failed run.
    const recorded = new Set([...RECORDED_RUN, ...FAILED_RUN].map((event) => event.type))
    expect([...recorded].sort()).toEqual([...types].sort())
  })

  it('changes the hook for each event or puts it on the unhandled list', async () => {
    server.use(http.post(AGUI, () => sseResponse(RECORDED_RUN)))
    const { result, onRunEnd } = renderInterview()
    await act(() => result.current.send('Gdańsk, trzy dni'))
    await waitFor(() => expect(onRunEnd).toHaveBeenCalled())

    const { view } = result.current
    expect(view.status).toBe('finished')
    // Every family delivered events. The client turns CHUNK events into START/CONTENT/END, so the
    // counts are at least what the recording holds.
    for (const family of EVENT_FAMILIES) expect(view.seen[family]).toBeGreaterThan(0)
    expect(Object.values(view.seen).reduce((sum, count) => sum + count, 0)).toBeGreaterThanOrEqual(
      RECORDED_RUN.length,
    )
    // Events the UI draws itself:
    expect(view.steps).toEqual([{ name: 'plan', done: true }])
    expect(view.reasoning).toBe('Najpierw miasto. Potem daty.')
    expect(view.thinking).toBe(false)
    expect(view.tools.map((tool) => [tool.name, tool.done])).toEqual([
      ['set_trip_basics', true],
      ['add_person', true],
    ])
    expect(view.subagents.map((sub) => [sub.name, sub.status])).toEqual([
      ['geocoder', 'finished'],
      ['prices', 'failed'],
    ])
    // Not drawn yet: logged in one place, not lost.
    expect(view.unhandled).toEqual([EventType.RAW, EventType.CUSTOM])
    // The messages came from the client's own bookkeeping, and the last snapshot won.
    expect(result.current.lines.map((line) => line.text)).toContain('Z migawki.')
  })

  it('shows a RUN_ERROR as a failed run with the server message', async () => {
    server.use(http.post(AGUI, () => sseResponse(FAILED_RUN)))
    const { result } = renderInterview()
    await act(() => result.current.send('Cześć'))
    expect(result.current.view.status).toBe('failed')
    expect(result.current.view.failure).toBe('Budżet wyczerpany')
    expect(result.current.view.failureCode).toBe('spend_limit')
    expect(result.current.error).toBe('spend_limit')
    expect(result.current.canRetry).toBe(true)
  })

  it('takes the knowledge of a state snapshot and the card of the shared state', async () => {
    const knowledge = {
      trip: { destination: 'Gdańsk' },
      people: [],
      preferences: [],
      missing: [],
      sources: [],
    }
    const card = { kind: 'choice', question: 'Którędy?', options: ['A', 'B'] }
    server.use(
      http.post(AGUI, () =>
        sseResponse([
          { type: EventType.RUN_STARTED, threadId: thread, runId: 'r1' },
          { type: EventType.STATE_SNAPSHOT, snapshot: { knowledge, card } },
          { type: EventType.RUN_FINISHED, threadId: thread, runId: 'r1' },
        ]),
      ),
    )
    const { result, onKnowledge } = renderInterview()
    await act(() => result.current.send('Cześć'))
    expect(onKnowledge).toHaveBeenCalledWith(knowledge)
    expect(result.current.card).toEqual(card)
  })

  it('ignores a state it does not know instead of failing the run', async () => {
    server.use(
      http.post(AGUI, () =>
        sseResponse([
          { type: EventType.RUN_STARTED, threadId: thread, runId: 'r1' },
          {
            type: EventType.STATE_SNAPSHOT,
            snapshot: { card: { kind: 'hologram', question: 1 }, knowledge: 7 },
          },
          { type: EventType.RUN_FINISHED, threadId: thread, runId: 'r1' },
        ]),
      ),
    )
    const { result, onKnowledge } = renderInterview()
    await act(() => result.current.send('Cześć'))
    expect(result.current.error).toBeNull()
    expect(result.current.card).toBeNull()
    expect(onKnowledge).not.toHaveBeenCalled()
  })

  it('does not start a second run while one is going', async () => {
    let runs = 0
    server.use(
      http.post(AGUI, async () => {
        runs += 1
        return sseResponse(
          [
            { type: EventType.RUN_STARTED, threadId: thread, runId: 'r1' },
            { type: EventType.RUN_FINISHED, threadId: thread, runId: 'r1' },
          ],
          20,
        )
      }),
    )
    const { result } = renderInterview()
    await act(async () => {
      const first = result.current.send('Pierwsze')
      await result.current.send('Drugie')
      await first
    })
    expect(runs).toBe(1)
  })
})
