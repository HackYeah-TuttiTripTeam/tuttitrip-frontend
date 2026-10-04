import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { isHomeWaiting } from '@/lib/shell'
import type { SessionStatus } from './use-session'

/**
 * `/` is the landing page for guests; a signed-in user goes straight to their trips. This
 * only navigates: what to show meanwhile is decided by shellFor (the "bare" layout).
 */
export function useHomeRedirect(pathname: string, status: SessionStatus, storedSession = true) {
  const navigate = useNavigate()
  useEffect(() => {
    if (status === 'authenticated' && isHomeWaiting(pathname, status, storedSession)) {
      void navigate({ to: '/trips', replace: true })
    }
  }, [pathname, status, storedSession, navigate])
}
