import {
  CopilotChat,
  CopilotKit,
  UseAgentUpdate,
  useAgent,
  useCopilotKit,
} from '@copilotkit/react-core/v2'
import '@copilotkit/react-core/v2/styles.css'
import { useMemo } from 'react'
import {
  createInterviewAgent,
  EMPTY_INTERVIEW_STATE,
  type InterviewState,
} from '@/api/interview-agent'
import { CardChoice } from '@/components/interview/card-choice'
import { FactsPanel } from '@/components/interview/facts-panel'

const AGENT_ID = 'interview'

function Interview() {
  const { agent } = useAgent({
    agentId: AGENT_ID,
    updates: [UseAgentUpdate.OnStateChanged, UseAgentUpdate.OnRunStatusChanged],
  })
  const { copilotkit } = useCopilotKit()
  const state = { ...EMPTY_INTERVIEW_STATE, ...(agent.state as Partial<InterviewState>) }
  const patchFacts = (fn: (facts: InterviewState['facts']) => InterviewState['facts']) =>
    agent.setState({ ...state, facts: fn(state.facts) })

  const answerCard = async (answer: string) => {
    agent.setState({ ...state, card: null })
    agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: answer })
    await copilotkit.runAgent({ agent })
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_20rem]">
      <div className="flex h-[70vh] flex-col gap-4">
        <h1 className="font-semibold text-xl">Wywiad (AG-UI, CopilotKit bez runtime)</h1>
        <CopilotChat agentId={AGENT_ID} className="min-h-0 flex-1" />
        {state.card && (
          <CardChoice
            card={state.card}
            disabled={agent.isRunning}
            onAnswer={(a) => void answerCard(a)}
          />
        )}
      </div>
      <FactsPanel
        facts={state.facts}
        onEdit={(key, value) =>
          patchFacts((facts) => facts.map((f) => (f.key === key ? { ...f, value } : f)))
        }
        onRemove={(key) => patchFacts((facts) => facts.filter((f) => f.key !== key))}
      />
    </div>
  )
}

/** Spike: the same agent and the same panel, chat UI and state hooks from CopilotKit. */
export function InterviewCopilotKitSpikeView() {
  const agent = useMemo(() => createInterviewAgent(crypto.randomUUID()), [])
  return (
    <CopilotKit selfManagedAgents={{ [AGENT_ID]: agent }}>
      <Interview />
    </CopilotKit>
  )
}
