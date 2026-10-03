import { useAuth0 } from '@auth0/auth0-react'
import { authConfig } from '@/lib/env'
import { m } from '@/paraglide/messages'

export type SessionStatus = 'disabled' | 'loading' | 'anonymous' | 'authenticated'

export interface Session {
  status: SessionStatus
  /** Readable reason why the last login failed, e.g. a misconfigured Auth0 API. */
  error: string | undefined
  userName: string | undefined
  userPicture: string | undefined
  login: () => void
  logout: () => void
}

const noop = () => undefined

function describeAuthError(error: Error | undefined): string | undefined {
  if (!error) return undefined
  if (/service not found|audience/i.test(error.message)) {
    return m.auth_error_unknown_api()
  }
  if (/access_denied|denied/i.test(error.message)) return m.auth_error_cancelled()
  return m.auth_error_other({ message: error.message })
}

/** Auth0 session, or status "disabled" when VITE_AUTH0_* is not configured. */
export function useSession(): Session {
  // Outside <Auth0Provider> this returns the SDK's inert default context.
  const auth0 = useAuth0()

  if (!authConfig) {
    return {
      status: 'disabled',
      error: undefined,
      userName: undefined,
      userPicture: undefined,
      login: noop,
      logout: noop,
    }
  }

  const status: SessionStatus = auth0.isLoading
    ? 'loading'
    : auth0.isAuthenticated
      ? 'authenticated'
      : 'anonymous'

  return {
    status,
    error: describeAuthError(auth0.error),
    userName: auth0.user?.name ?? auth0.user?.email,
    userPicture: auth0.user?.picture,
    login: () => {
      void auth0.loginWithRedirect({
        appState: { returnTo: `${window.location.pathname}${window.location.search}` },
      })
    },
    logout: () => {
      void auth0.logout({ logoutParams: { returnTo: window.location.origin } })
    },
  }
}
