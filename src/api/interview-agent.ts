import { HttpAgent } from '@ag-ui/client'
import { currentAccessToken } from '@/api/client'

export interface ChatLine {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export interface InterviewFact {
  key: string
  label: string
  value: string
}

export interface InterviewCard {
  kind: 'choice' | 'slider' | 'text' | 'dot_pool' | 'confirm'
  question: string
  options: string[]
}

/** AG-UI shared state, mirrors `InterviewState` in the backend. */
export interface InterviewState {
  facts: InterviewFact[]
  card: InterviewCard | null
}

export const EMPTY_INTERVIEW_STATE: InterviewState = { facts: [], card: null }

// Same origin: the Worker (deployed) or the Vite dev server proxies /api to the backend.
export const INTERVIEW_AGUI_URL = '/api/v1/interview/agui'

/**
 * fetch for HttpAgent: reads a fresh token for every run (Auth0 refreshes it
 * silently), so a long interview never sends an expired Bearer. `headers` on the
 * agent would be a snapshot, and CopilotKit rewrites them from its own provider.
 */
const authedFetch = async (url: string, init: RequestInit): Promise<Response> => {
  const headers = new Headers(init.headers)
  const token = await currentAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(url, { ...init, headers })
}

/** One HttpAgent per interview thread. */
export function createInterviewAgent(threadId?: string): HttpAgent {
  return new HttpAgent({
    url: INTERVIEW_AGUI_URL,
    threadId,
    initialState: EMPTY_INTERVIEW_STATE,
    fetch: authedFetch,
  })
}
