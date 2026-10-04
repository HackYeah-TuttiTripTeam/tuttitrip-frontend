import { type BaseEvent, type Event, EventType } from '@ag-ui/client'

/** The eight families of AG-UI 1.0 events (docs.ag-ui.com/concepts/events). */
export const EVENT_FAMILIES = [
  'run',
  'text',
  'tool',
  'state',
  'activity',
  'reasoning',
  'subagent',
  'passthrough',
] as const

export type EventFamily = (typeof EVENT_FAMILIES)[number]

/** Every event type and its family. A `Record` over the enum: a new protocol event fails `tsc`. */
export const FAMILY_OF: Record<EventType, EventFamily> = {
  [EventType.RUN_STARTED]: 'run',
  [EventType.RUN_FINISHED]: 'run',
  [EventType.RUN_ERROR]: 'run',
  [EventType.STEP_STARTED]: 'run',
  [EventType.STEP_FINISHED]: 'run',
  [EventType.TEXT_MESSAGE_START]: 'text',
  [EventType.TEXT_MESSAGE_CONTENT]: 'text',
  [EventType.TEXT_MESSAGE_END]: 'text',
  [EventType.TEXT_MESSAGE_CHUNK]: 'text',
  [EventType.TOOL_CALL_START]: 'tool',
  [EventType.TOOL_CALL_ARGS]: 'tool',
  [EventType.TOOL_CALL_END]: 'tool',
  [EventType.TOOL_CALL_CHUNK]: 'tool',
  [EventType.TOOL_CALL_RESULT]: 'tool',
  [EventType.STATE_SNAPSHOT]: 'state',
  [EventType.STATE_DELTA]: 'state',
  [EventType.MESSAGES_SNAPSHOT]: 'state',
  [EventType.ACTIVITY_SNAPSHOT]: 'activity',
  [EventType.ACTIVITY_DELTA]: 'activity',
  [EventType.REASONING_START]: 'reasoning',
  [EventType.REASONING_MESSAGE_START]: 'reasoning',
  [EventType.REASONING_MESSAGE_CONTENT]: 'reasoning',
  [EventType.REASONING_MESSAGE_END]: 'reasoning',
  [EventType.REASONING_MESSAGE_CHUNK]: 'reasoning',
  [EventType.REASONING_END]: 'reasoning',
  [EventType.REASONING_ENCRYPTED_VALUE]: 'reasoning',
  [EventType.SUBAGENT_STARTED]: 'subagent',
  [EventType.SUBAGENT_FINISHED]: 'subagent',
  [EventType.SUBAGENT_ERROR]: 'subagent',
  [EventType.RAW]: 'passthrough',
  [EventType.CUSTOM]: 'passthrough',
}

export interface ToolCallView {
  id: string
  name: string
  done: boolean
}

export interface SubagentView {
  id: string
  name: string
  status: 'running' | 'finished' | 'failed'
}

/** What the UI draws from the stream besides the messages and the shared state. */
export interface RunView {
  status: 'idle' | 'running' | 'finished' | 'failed'
  /** Message of RUN_ERROR, if the run failed that way. */
  failure: string | null
  /** `code` of RUN_ERROR (`spend_limit`, `timeout`, `unavailable`, `error`), if the server sent one. */
  failureCode: string | null
  steps: { name: string; done: boolean }[]
  tools: ToolCallView[]
  /** Reasoning text of the current run, shown folded as "The assistant thinks". */
  reasoning: string
  thinking: boolean
  subagents: SubagentView[]
  /** Types of events nobody draws yet (RAW, CUSTOM): kept in one place, logged in dev. */
  unhandled: string[]
  /** How many events of each family the run delivered (the test counts them). */
  seen: Record<EventFamily, number>
}

const emptySeen = (): Record<EventFamily, number> => ({
  run: 0,
  text: 0,
  tool: 0,
  state: 0,
  activity: 0,
  reasoning: 0,
  subagent: 0,
  passthrough: 0,
})

export const EMPTY_RUN_VIEW: RunView = {
  status: 'idle',
  failure: null,
  failureCode: null,
  steps: [],
  tools: [],
  reasoning: '',
  thinking: false,
  subagents: [],
  unhandled: [],
  seen: emptySeen(),
}

const upsertTool = (tools: ToolCallView[], tool: ToolCallView) =>
  tools.some((candidate) => candidate.id === tool.id)
    ? tools.map((candidate) => (candidate.id === tool.id ? tool : candidate))
    : [...tools, tool]

const setSubagent = (list: SubagentView[], next: SubagentView) =>
  list.some((candidate) => candidate.id === next.id)
    ? list.map((candidate) => (candidate.id === next.id ? { ...candidate, ...next } : candidate))
    : [...list, next]

/**
 * Folds one event into the run view. Messages (text, tool calls, snapshots, activity) and the
 * shared state are applied by `HttpAgent` itself and read through its subscriber, so for those
 * events this only counts them; everything the UI draws on its own is kept here. The switch is
 * exhaustive: a new protocol event is a compile error, not a silent drop.
 */
export function reduceRunEvent(view: RunView, event: Event): RunView {
  const family = FAMILY_OF[event.type]
  const next: RunView = { ...view, seen: { ...view.seen, [family]: view.seen[family] + 1 } }
  switch (event.type) {
    case EventType.RUN_STARTED:
      return { ...EMPTY_RUN_VIEW, seen: next.seen, status: 'running' }
    case EventType.RUN_FINISHED:
      return { ...next, status: 'finished', thinking: false }
    case EventType.RUN_ERROR:
      return {
        ...next,
        status: 'failed',
        failure: event.message,
        failureCode: event.code ?? null,
        thinking: false,
      }
    case EventType.STEP_STARTED:
      return { ...next, steps: [...next.steps, { name: event.stepName, done: false }] }
    case EventType.STEP_FINISHED:
      return {
        ...next,
        steps: next.steps.map((step) =>
          step.name === event.stepName ? { ...step, done: true } : step,
        ),
      }
    case EventType.TOOL_CALL_START:
      return {
        ...next,
        tools: upsertTool(next.tools, {
          id: event.toolCallId,
          name: event.toolCallName,
          done: false,
        }),
      }
    case EventType.TOOL_CALL_END:
    case EventType.TOOL_CALL_RESULT:
      return {
        ...next,
        tools: next.tools.map((tool) =>
          tool.id === event.toolCallId ? { ...tool, done: true } : tool,
        ),
      }
    case EventType.TOOL_CALL_CHUNK:
      return event.toolCallId && event.toolCallName
        ? {
            ...next,
            tools: upsertTool(next.tools, {
              id: event.toolCallId,
              name: event.toolCallName,
              done: false,
            }),
          }
        : next
    case EventType.REASONING_START:
    case EventType.REASONING_MESSAGE_START:
      return { ...next, thinking: true }
    case EventType.REASONING_MESSAGE_CONTENT:
    case EventType.REASONING_MESSAGE_CHUNK:
      return { ...next, thinking: true, reasoning: next.reasoning + (event.delta ?? '') }
    case EventType.REASONING_MESSAGE_END:
      return next
    case EventType.REASONING_END:
      return { ...next, thinking: false }
    case EventType.SUBAGENT_STARTED:
      return {
        ...next,
        subagents: setSubagent(next.subagents, {
          id: event.subagentRunId,
          name: event.name,
          status: 'running',
        }),
      }
    case EventType.SUBAGENT_FINISHED:
      return {
        ...next,
        subagents: next.subagents.map((sub) =>
          sub.id === event.subagentRunId ? { ...sub, status: 'finished' } : sub,
        ),
      }
    case EventType.SUBAGENT_ERROR:
      return {
        ...next,
        subagents: next.subagents.map((sub) =>
          sub.id === event.subagentRunId ? { ...sub, status: 'failed' } : sub,
        ),
      }
    // Applied by HttpAgent to the messages and the shared state, which the hook reads.
    case EventType.TEXT_MESSAGE_START:
    case EventType.TEXT_MESSAGE_CONTENT:
    case EventType.TEXT_MESSAGE_END:
    case EventType.TEXT_MESSAGE_CHUNK:
    case EventType.TOOL_CALL_ARGS:
    case EventType.STATE_SNAPSHOT:
    case EventType.STATE_DELTA:
    case EventType.MESSAGES_SNAPSHOT:
    case EventType.ACTIVITY_SNAPSHOT:
    case EventType.ACTIVITY_DELTA:
    // Encrypted reasoning is only kept by the client (it goes back to the model), never shown.
    case EventType.REASONING_ENCRYPTED_VALUE:
      return next
    // Nothing draws these yet: one place, with a log in dev, not a silent drop.
    case EventType.RAW:
    case EventType.CUSTOM:
      return { ...next, unhandled: [...next.unhandled, event.type] }
  }
}

const isKnownEvent = (event: BaseEvent): event is Event => event.type in FAMILY_OF

/**
 * Entry point for the subscriber's `onEvent`, which hands over `BaseEvent`. The client has parsed
 * every event against the protocol schema already, so a known type is a full `Event`; a type
 * from a newer protocol goes to the unhandled list instead of being dropped.
 */
export function reduceStreamEvent(view: RunView, event: BaseEvent): RunView {
  if (isKnownEvent(event)) return reduceRunEvent(view, event)
  return { ...view, unhandled: [...view.unhandled, String(event.type)] }
}
