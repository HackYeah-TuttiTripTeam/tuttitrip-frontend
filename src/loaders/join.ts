import { redirect } from '@tanstack/react-router'
import { takeFragmentToken } from '@/lib/invite-link'

/**
 * Runs before /join renders or calls the API: the invitation token leaves the address bar
 * first. The redirect (a history replace) also clears the fragment from the router's own state.
 */
export function beforeLoadJoin({ location }: { location: { hash: string } }) {
  const token = takeFragmentToken()
  if (token || location.hash) throw redirect({ to: '/join', hash: '', replace: true })
}
