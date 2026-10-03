import { createFileRoute } from '@tanstack/react-router'
import { publicHead } from '@/loaders/seo'
import { HomeView } from '@/views/home-view'

export const Route = createFileRoute('/')({
  component: HomeView,
  head: () => publicHead('/'),
})
