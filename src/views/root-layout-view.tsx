import { HeadContent, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense, useState } from 'react'
import { AppShell } from '@/components/shared/app-shell'
import { BootScreen } from '@/components/shared/boot-screen'
import { PublicShell } from '@/components/shared/public-shell'
import { useApiAuthBridge } from '@/hooks/use-api-auth-bridge'
import { useCleanServerHead } from '@/hooks/use-clean-server-head'
import { useHomeRedirect } from '@/hooks/use-home-redirect'
import { useLocale } from '@/hooks/use-locale'
import { useSession } from '@/hooks/use-session'
import { appEnv } from '@/lib/env'
import { hasStoredSession } from '@/lib/session-hint'
import { shellFor } from '@/lib/shell'
import { useUiStore } from '@/stores/ui-store'

// Dev-only: the import() calls are dropped from production bundles.
const Devtools = import.meta.env.DEV
  ? lazy(async () => {
      const [{ TanStackRouterDevtools }, { ReactQueryDevtools }] = await Promise.all([
        import('@tanstack/react-router-devtools'),
        import('@tanstack/react-query-devtools'),
      ])
      return {
        default: () => (
          <>
            <TanStackRouterDevtools position="bottom-right" />
            <ReactQueryDevtools buttonPosition="bottom-left" />
          </>
        ),
      }
    })
  : () => null

export function RootLayoutView() {
  useApiAuthBridge()
  useCleanServerHead()
  const session = useSession()
  const { locale, setLocale } = useLocale()
  const setCreateTripOpen = useUiStore((state) => state.setCreateTripOpen)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  // Read once: a session stored while the page is open is Auth0's business, not a reason to blink.
  const [storedSession] = useState(hasStoredSession)
  const shell = shellFor(pathname, session.status, storedSession)
  useHomeRedirect(pathname, session.status, storedSession)
  const language = { locale, onChange: setLocale }
  const envLabel = appEnv === 'main' ? null : appEnv

  return (
    <>
      <HeadContent />
      {shell === 'bare' && <BootScreen />}
      {shell === 'public' && (
        <PublicShell
          status={session.status}
          language={language}
          envLabel={envLabel}
          onLogin={session.login}
          onSignup={session.signup}
        >
          <Outlet />
        </PublicShell>
      )}
      {shell === 'app' && (
        <AppShell
          account={{
            status: session.status,
            userName: session.userName,
            userPicture: session.userPicture,
            onLogin: session.login,
            onLogout: session.logout,
          }}
          language={language}
          envLabel={envLabel}
          onCreateTrip={() => {
            // Creating a trip needs an account; ask guests to sign in first.
            if (session.status === 'anonymous') return session.login()
            void navigate({ to: '/trips', search: (prev) => prev })
            setCreateTripOpen(true)
          }}
        >
          <Outlet />
        </AppShell>
      )}
      <Suspense>
        <Devtools />
      </Suspense>
    </>
  )
}
