import type { HttpAgent } from '@ag-ui/client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyAuthHeaders,
  type ChatLine,
  createInterviewAgent,
  EMPTY_INTERVIEW_STATE,
  type InterviewState,
} from '@/api/interview-agent'

export interface Interview {
  lines: ChatLine[]
  state: InterviewState
  running: boolean
  error: string | null
  firstCardMs: number | null
  send: (text: string) => Promise<void>
  /** The user's answer to the current card goes back as a user message. */
  answerCard: (answer: string) => Promise<void>
  /** Edit in the panel: shared state changes locally and rides along with the next run. */
  editFact: (key: string, value: string) => void
  removeFact: (key: string) => void
  retry: () => Promise<void>
}

function linesOf(agent: HttpAgent): ChatLine[] {
  const lines: ChatLine[] = []
  for (const m of agent.messages) {
    if ((m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content)
      lines.push({ id: m.id, role: m.role, text: m.content })
  }
  return lines
}

export function useInterview(): Interview {
  const agent = useMemo(() => createInterviewAgent(crypto.randomUUID()), [])
  const [lines, setLines] = useState<ChatLine[]>([])
  const [state, setState] = useState<InterviewState>(EMPTY_INTERVIEW_STATE)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firstCardMs, setFirstCardMs] = useState<number | null>(null)
  const startedAt = useRef(0)

  useEffect(() => {
    const subscription = agent.subscribe({
      onMessagesChanged: () => setLines(linesOf(agent)),
      onStateChanged: ({ state: next }) => {
        const typed = next as InterviewState
        setState({ facts: typed.facts ?? [], card: typed.card ?? null })
        if (typed.card && startedAt.current) {
          setFirstCardMs((prev) => prev ?? Math.round(performance.now() - startedAt.current))
        }
      },
      onRunFailed: ({ error: failure }) => setError(failure.message),
    })
    return () => {
      subscription.unsubscribe()
      agent.abortRun()
    }
  }, [agent])

  const run = useCallback(async () => {
    setError(null)
    setRunning(true)
    startedAt.current = performance.now()
    try {
      await applyAuthHeaders(agent)
      await agent.runAgent()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Nie udało się połączyć z asystentem.')
    } finally {
      setRunning(false)
    }
  }, [agent])

  const send = useCallback(
    async (text: string) => {
      agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: text })
      setLines(linesOf(agent))
      await run()
    },
    [agent, run],
  )

  const answerCard = useCallback(
    async (answer: string) => {
      agent.setState({ ...(agent.state as InterviewState), card: null })
      await send(answer)
    },
    [agent, send],
  )

  const patchFacts = useCallback(
    (fn: (facts: InterviewState['facts']) => InterviewState['facts']) => {
      const current = agent.state as InterviewState
      agent.setState({ ...current, facts: fn(current.facts) })
      setState((prev) => ({ ...prev, facts: fn(prev.facts) }))
    },
    [agent],
  )

  const editFact = useCallback(
    (key: string, value: string) =>
      patchFacts((facts) => facts.map((f) => (f.key === key ? { ...f, value } : f))),
    [patchFacts],
  )
  const removeFact = useCallback(
    (key: string) => patchFacts((facts) => facts.filter((f) => f.key !== key)),
    [patchFacts],
  )

  return {
    lines,
    state,
    running,
    error,
    firstCardMs,
    send,
    answerCard,
    editFact,
    removeFact,
    retry: run,
  }
}
