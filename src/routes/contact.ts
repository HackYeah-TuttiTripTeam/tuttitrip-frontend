import { createFileRoute } from '@tanstack/react-router'
import { publicHead } from '@/loaders/seo'
import { ContactView } from '@/views/contact-view'

export const Route = createFileRoute('/contact')({
  component: ContactView,
  head: () => publicHead('/contact'),
})
