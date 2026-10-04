import { useAuth0 } from '@auth0/auth0-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { clearDemoSession } from '@/lib/demo-session'
import { authConfig, isDev } from '@/lib/env'
import { m } from '@/paraglide/messages'
import { useDemoStatus } from './use-demo-session'

export type SessionStatus = 'disabled' | 'loading' | 'anonymous' | 'authenticated'

export interface Session {
  status: SessionStatus
  /** Readable reason why the last login failed, e.g. a misconfigured Auth0 API. */
  error: string | undefined
  userName: string | undefined
  userPicture: string | undefined
  login: () => void
  /** Same redirect as login, opened on the sign-up screen of Auth0. */
  signup: () => void
  logout: () => void
}

const noop = () => undefined

/**
 * Auth0 brings the user back to the page the login started from (see onRedirectCallback).
 * Path and query only: a fragment (an invitation token) must never ride along in the state.
 */
export const returnToHere = () => ({
  returnTo: `${window.location.pathname}${window.location.search}`,
})

function describeAuthError(error: Error | undefined): string | undefined {
  if (!error) return undefined
  if (/service not found|audience/i.test(error.message)) {
    return isDev ? m.auth_error_unknown_api_dev() : m.auth_error_unknown_api()
  }
  if (/access_denied|denied/i.test(error.message)) return m.auth_error_cancelled()
  return m.auth_error_other({ message: error.message })
}

/** Auth0 session, or status "disabled" when VITE_AUTH0_* is not configured. */
export function useSession(): Session {
  // Outside <Auth0Provider> this returns the SDK's inert default context.
  const auth0 = useAuth0()
  const demo = useDemoStatus()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const leaveDemo = (extra?: { authorizationParams: { screen_hint: string } }) => {
    clearDemoSession()
    queryClient.clear()
    if (authConfig) void auth0.loginWithRedirect({ appState: returnToHere(), ...extra })
    else void navigate({ to: '/', replace: true })
  }

  // The shared jury account: signed in without Auth0. Logout only forgets the tab's session.
  if (demo === 'active') {
    return {
      status: 'authenticated',
      error: undefined,
      userName: m.demo_account_name(),
      userPicture: undefined,
      // A real login replaces the shared account: forget it first, then go to Auth0 (without
      // Auth0 configured there is nowhere to go, and the session simply ends).
      login: () => leaveDemo(),
      signup: () => leaveDemo({ authorizationParams: { screen_hint: 'signup' } }),
      logout: () => {
        clearDemoSession()
        // The next visitor of this tab must not see the jury's cached data.
        queryClient.clear()
        void navigate({ to: '/', replace: true })
      },
    }
  }

  if (!authConfig) {
    return {
      status: 'disabled',
      error: undefined,
      userName: undefined,
      userPicture: undefined,
      login: noop,
      signup: noop,
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
      void auth0.loginWithRedirect({ appState: returnToHere() })
    },
    signup: () => {
      void auth0.loginWithRedirect({
        appState: returnToHere(),
        authorizationParams: { screen_hint: 'signup' },
      })
    },
    logout: () => {
      void auth0.logout({ logoutParams: { returnTo: window.location.origin } })
    },
  }
}
