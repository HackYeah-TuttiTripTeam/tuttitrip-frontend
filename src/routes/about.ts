import { createFileRoute } from '@tanstack/react-router'
import { publicHead } from '@/loaders/seo'
import { AboutView } from '@/views/about-view'

export const Route = createFileRoute('/about')({
  component: AboutView,
  head: () => publicHead('/about'),
})
