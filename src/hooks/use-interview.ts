import type { HttpAgent } from '@ag-ui/client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/errors'
import { createInterviewAgent } from '@/api/interview-agent'
import { EMPTY_RUN_VIEW, type RunView, reduceStreamEvent } from '@/api/interview-events'
import { isDev } from '@/lib/env'
import {
  type ChatLine,
  type InterviewCard,
  type Knowledge,
  parseInterviewState,
} from '@/lib/interview'

/** Why the last run failed; the view picks the words and the action for each. */
export type InterviewError = 'auth' | 'forbidden' | 'busy' | 'session' | 'offline' | 'failed'

const AUTH0_LOGIN_ERRORS = ['login_required', 'consent_required', 'missing_refresh_token']

/** Auth0 throws these when the silent token refresh has no session left. */
const isAuth0LoginError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'error' in error &&
  typeof error.error === 'string' &&
  AUTH0_LOGIN_ERRORS.includes(error.error)

export function classifyRunError(error: unknown): InterviewError {
  if (isAuth0LoginError(error)) return 'auth'
  if (error instanceof ApiError) {
    if (error.status === 401) return 'auth'
    if (error.status === 403) return 'forbidden'
    if (error.status === 404) return 'session'
    if (error.status === 409) return 'busy'
    return 'failed'
  }
  // A stream cut off in the middle surfaces as a TypeError ("network error", "terminated").
  return error instanceof TypeError ? 'offline' : 'failed'
}

const textOf = (content: unknown) => (typeof content === 'string' ? content : '')

function assistantLines(agent: HttpAgent): ChatLine[] {
  const lines: ChatLine[] = []
  for (const message of agent.messages) {
    const text = textOf(message.content)
    if (message.role === 'assistant' && text) {
      lines.push({ id: message.id, role: 'assistant', text })
    }
  }
  return lines
}

export interface UseInterviewOptions {
  tripId: string
  /** Id of the open session (the AG-UI `threadId`), or undefined before the first sentence. */
  threadId: string | undefined
  /** Starts the session and returns its id; called by the first message only. */
  startSession: () => Promise<string>
  /** The panel takes the snapshot of a tool. */
  onKnowledge: (knowledge: Knowledge) => void
  /** A run ended, well or badly: the panel refetches what the host sees. */
  onRunEnd: () => void
}

/**
 * The text interview over AG-UI. The client sends only the latest user text: the server keeps
 * the history of the session, so the agent's own message list holds one turn at a time and the
 * transcript shown here is `history` (loaded by the view) + what was said in this visit.
 */
export function useInterview({
  tripId,
  threadId,
  startSession,
  onKnowledge,
  onRunEnd,
}: UseInterviewOptions) {
  const agentRef = useRef<HttpAgent | null>(null)
  // The session id outlives one call: the first message starts the session, later ones reuse it.
  const idRef = useRef(threadId)
  if (threadId) idRef.current = threadId
  /** A RUN_ERROR event: the run can end without the promise rejecting. */
  const runErrorRef = useRef<string | null>(null)
  const callbacks = useRef({ onKnowledge, onRunEnd })
  callbacks.current = { onKnowledge, onRunEnd }

  const [said, setSaid] = useState<ChatLine[]>([])
  const [live, setLive] = useState<ChatLine[]>([])
  const [card, setCard] = useState<InterviewCard | null>(null)
  const [running, setRunning] = useState(false)
  // The state above lags a render behind; two quick taps must still start one run.
  const busyRef = useRef(false)
  const [error, setError] = useState<InterviewError | null>(null)
  /** The message of a failed run, kept for "Try again". */
  const [failed, setFailed] = useState<ChatLine | null>(null)
  const [view, setView] = useState<RunView>(EMPTY_RUN_VIEW)

  const dispose = useCallback(() => {
    agentRef.current?.abortRun()
    agentRef.current = null
  }, [])
  // The view is keyed by trip, so a new trip is a new hook; leaving stops a running stream.
  useEffect(() => dispose, [dispose])

  const agentFor = useCallback(
    (id: string): HttpAgent => {
      const existing = agentRef.current
      if (existing && existing.threadId === id) return existing
      existing?.abortRun()
      const agent = createInterviewAgent(tripId, id)
      agent.subscribe({
        onMessagesChanged: () => setLive(assistantLines(agent)),
        onStateChanged: ({ state }) => {
          const parsed = parseInterviewState(state)
          setCard(parsed.card)
          if (parsed.knowledge) callbacks.current.onKnowledge(parsed.knowledge)
        },
        onRunErrorEvent: ({ event }) => {
          runErrorRef.current = event.message
        },
        onEvent: ({ event }) => {
          setView((previous) => reduceStreamEvent(previous, event))
        },
      })
      agentRef.current = agent
      return agent
    },
    [tripId],
  )

  useEffect(() => {
    if (!isDev) return
    for (const type of view.unhandled) console.warn('[interview] unhandled AG-UI event', type)
  }, [view.unhandled])

  const run = useCallback(async (agent: HttpAgent, user: ChatLine) => {
    busyRef.current = true
    setError(null)
    setRunning(true)
    runErrorRef.current = null
    // One turn: the server holds the rest of the conversation.
    agent.setMessages([{ id: user.id, role: 'user', content: user.text }])
    try {
      await agent.runAgent()
      if (runErrorRef.current !== null) throw new Error(runErrorRef.current)
      const answer = assistantLines(agent)
      setSaid((previous) => [...previous, ...answer])
      setFailed(null)
      agent.setMessages([])
    } catch (failure) {
      setError(classifyRunError(failure))
      setFailed(user)
      setLive([])
    } finally {
      busyRef.current = false
      setRunning(false)
      callbacks.current.onRunEnd()
    }
  }, [])

  /** The agent of the session; the first message starts the session, a failure to start is a failed run. */
  const ensureAgent = useCallback(
    async (user: ChatLine): Promise<HttpAgent | null> => {
      try {
        idRef.current ??= await startSession()
        return agentFor(idRef.current)
      } catch (failure) {
        busyRef.current = false
        setError(classifyRunError(failure))
        setFailed(user)
        return null
      }
    },
    [startSession, agentFor],
  )

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || busyRef.current) return
      busyRef.current = true
      const user: ChatLine = { id: crypto.randomUUID(), role: 'user', text: trimmed }
      setSaid((previous) => [...previous, user])
      setCard(null)
      const agent = await ensureAgent(user)
      if (!agent) return
      agent.setState({ ...agent.state, card: null })
      await run(agent, user)
    },
    [ensureAgent, run],
  )

  /** Runs the last message again after a failure; the message stays in the transcript. */
  const retry = useCallback(async () => {
    if (!failed || busyRef.current) return
    busyRef.current = true
    const agent = await ensureAgent(failed)
    if (agent) await run(agent, failed)
  }, [failed, ensureAgent, run])

  /** The answer to a card is a user message: the card is data, the message is its text. */
  const answerCard = useCallback((answer: string) => send(answer), [send])

  return {
    lines: [...said, ...live].filter(
      (line, index, all) => all.findIndex((other) => other.id === line.id) === index,
    ),
    card,
    running,
    error,
    view,
    send,
    answerCard,
    retry,
    canRetry: error !== null && failed !== null,
    abort: dispose,
  }
}
