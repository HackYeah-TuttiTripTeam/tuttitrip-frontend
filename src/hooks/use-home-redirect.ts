import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import type { SessionStatus } from './use-session'

/**
 * `/` is the landing page for guests; a signed-in user goes straight to their trips.
 * Returns true while the page must not be shown: Auth0 is still loading the session, or
 * the redirect is under way. The caller renders a blank placeholder then, so the landing
 * page never flashes for people who are signed in.
 */
export function useHomeRedirect(status: SessionStatus): boolean {
  const navigate = useNavigate()
  useEffect(() => {
    if (status === 'authenticated') void navigate({ to: '/trips', replace: true })
  }, [status, navigate])
  return status === 'loading' || status === 'authenticated'
}
