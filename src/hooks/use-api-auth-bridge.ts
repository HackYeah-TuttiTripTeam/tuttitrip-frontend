import { useAuth0 } from '@auth0/auth0-react'
import { useLayoutEffect } from 'react'
import { setAccessTokenGetter } from '@/api/client'
import { authConfig } from '@/lib/env'

/**
 * Hands Auth0's token getter to the openapi-fetch middleware.
 * A layout effect, so it runs before child queries start fetching.
 */
export function useApiAuthBridge(): void {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0()
  const enabled = authConfig !== null && isAuthenticated

  useLayoutEffect(() => {
    if (!enabled) {
      setAccessTokenGetter(null)
      return
    }
    setAccessTokenGetter(() => getAccessTokenSilently())
    return () => setAccessTokenGetter(null)
  }, [enabled, getAccessTokenSilently])
}
