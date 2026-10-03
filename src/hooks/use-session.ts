import { useAuth0 } from '@auth0/auth0-react'
import { authConfig } from '@/lib/env'

export type SessionStatus = 'disabled' | 'loading' | 'anonymous' | 'authenticated'

export interface Session {
  status: SessionStatus
  userName: string | undefined
  userPicture: string | undefined
  login: () => void
  logout: () => void
}

const noop = () => undefined

/** Auth0 session, or status "disabled" when VITE_AUTH0_* is not configured. */
export function useSession(): Session {
  // Outside <Auth0Provider> this returns the SDK's inert default context.
  const auth0 = useAuth0()

  if (!authConfig) {
    return {
      status: 'disabled',
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
