import { createFileRoute } from '@tanstack/react-router'
import { DemoView } from '@/views/demo-view'

export const Route = createFileRoute('/demo')({ component: DemoView })
