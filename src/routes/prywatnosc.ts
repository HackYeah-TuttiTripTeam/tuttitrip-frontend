import { createFileRoute } from '@tanstack/react-router'
import { publicHead } from '@/loaders/seo'
import { PrivacyView } from '@/views/privacy-view'

export const Route = createFileRoute('/prywatnosc')({
  component: PrivacyView,
  head: () => publicHead('/prywatnosc'),
})
