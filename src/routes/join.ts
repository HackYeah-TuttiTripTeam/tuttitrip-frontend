import { createFileRoute } from '@tanstack/react-router'
import { JoinView } from '@/views/join-view'

// The invitation token is in the URL fragment (#t=...), which the router never sends anywhere:
// no validateSearch, no loader, the view reads it once and removes it from the address bar.
export const Route = createFileRoute('/join')({
  component: JoinView,
})
