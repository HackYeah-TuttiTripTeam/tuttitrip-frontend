import { createFileRoute } from '@tanstack/react-router'
import { InterviewCopilotKitSpikeView } from '@/views/interview-copilotkit-spike-view'

export const Route = createFileRoute('/interview-spike-copilotkit')({
  component: InterviewCopilotKitSpikeView,
})
