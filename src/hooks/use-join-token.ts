import { useState } from 'react'
import { currentJoinToken } from '@/lib/invite-link'

/**
 * The invitation token of this visit. The route already read it from the fragment and took the
 * fragment off the address bar (loaders/join.ts); after a login redirect it comes from the stash.
 */
export function useJoinToken(): string | null {
  const [token] = useState(() => currentJoinToken())
  return token
}
