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

/** One HttpAgent per interview thread; the token is set before every run. */
export function createInterviewAgent(threadId?: string): HttpAgent {
  return new HttpAgent({
    url: INTERVIEW_AGUI_URL,
    threadId,
    initialState: EMPTY_INTERVIEW_STATE,
  })
}

/** Refresh the Bearer token on the agent. Call before each `runAgent()`. */
export async function applyAuthHeaders(agent: HttpAgent): Promise<void> {
  const token = await currentAccessToken()
  agent.headers = token ? { Authorization: `Bearer ${token}` } : {}
}
