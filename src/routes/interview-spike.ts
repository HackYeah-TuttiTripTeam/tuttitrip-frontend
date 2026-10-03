import { createFileRoute } from '@tanstack/react-router'
import { InterviewSpikeView } from '@/views/interview-spike-view'

export const Route = createFileRoute('/interview-spike')({
  component: InterviewSpikeView,
})
