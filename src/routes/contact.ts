import { createFileRoute } from '@tanstack/react-router'
import { ContactView } from '@/views/contact-view'

export const Route = createFileRoute('/contact')({ component: ContactView })
