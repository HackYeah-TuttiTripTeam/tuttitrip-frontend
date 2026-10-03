import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { captureJoinToken, clearJoinToken, parseInviteFragment } from '@/lib/invite-link'

/**
 * Reads the invitation token from the `#t=` fragment of /join (or from the login round-trip) and
 * takes it off the address bar, so it stays out of the history and out of screenshots.
 */
export function useJoinToken() {
  const navigate = useNavigate()
  const [token] = useState(() => captureJoinToken(window.location.hash))

  useEffect(() => {
    if (parseInviteFragment(window.location.hash)) {
      void navigate({ to: '/join', hash: '', replace: true })
    }
  }, [navigate])

  return { token, clear: clearJoinToken }
}
