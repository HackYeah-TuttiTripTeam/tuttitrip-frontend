import { createFileRoute } from '@tanstack/react-router'
import { beforeLoadJoin } from '@/loaders/join'
import { JoinView } from '@/views/join-view'

// The invitation token is in the URL fragment (#t=...), which is never sent to a server: no
// validateSearch. beforeLoad takes the token and the fragment off before anything else runs.
export const Route = createFileRoute('/join')({
  beforeLoad: beforeLoadJoin,
  component: JoinView,
})
