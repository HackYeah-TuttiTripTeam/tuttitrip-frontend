import { redirect } from '@tanstack/react-router'
import { takeVoteToken } from '@/lib/vote-link'
import { m } from '@/paraglide/messages'

/**
 * Runs before /glos renders or calls the API: the voting token leaves the address bar first. The
 * redirect (a history replace) also clears the fragment from the router's own state.
 */
export function beforeLoadVote({ location }: { location: { hash: string } }) {
  const token = takeVoteToken()
  if (token || location.hash) throw redirect({ to: '/glos', hash: '', replace: true })
}

/** A private link: no indexing, and no Referer to anything the page might link to. */
export function voteHead() {
  return {
    meta: [
      { title: `${m.vote_head_title()} | TuttiTrip` },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'referrer', content: 'no-referrer' },
    ],
  }
}
