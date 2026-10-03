import { createFileRoute } from '@tanstack/react-router'
import { AboutView } from '@/views/about-view'

export const Route = createFileRoute('/about')({ component: AboutView })
