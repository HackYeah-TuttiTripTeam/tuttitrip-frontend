import { createFileRoute } from '@tanstack/react-router'
import { beforeLoadVote, voteHead } from '@/loaders/vote'
import { VoteView } from '@/views/vote-view'

// The voting token is in the URL fragment (#t=...), which is never sent to a server: no
// validateSearch. beforeLoad takes the token and the fragment off before anything else runs.
export const Route = createFileRoute('/glos')({
  beforeLoad: beforeLoadVote,
  head: voteHead,
  component: VoteView,
})
