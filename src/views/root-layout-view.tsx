import { HeadContent, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense, useEffect, useState } from 'react'
import { AppShell } from '@/components/shared/app-shell'
import { BootScreen } from '@/components/shared/boot-screen'
import { DemoBanner } from '@/components/shared/demo-banner'
import { PublicShell } from '@/components/shared/public-shell'
import { useAdminAccess } from '@/hooks/use-admin-access'
import { useApiAuthBridge } from '@/hooks/use-api-auth-bridge'
import { useCleanServerHead } from '@/hooks/use-clean-server-head'
import { useDemoStatus } from '@/hooks/use-demo-session'
import { useHomeRedirect } from '@/hooks/use-home-redirect'
import { useLocale } from '@/hooks/use-locale'
import { useSession } from '@/hooks/use-session'
import { useTheme } from '@/hooks/use-theme'
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
  const adminAccess = useAdminAccess(session.status)
  const { locale, setLocale } = useLocale()
  const { theme, resolved, setTheme } = useTheme()
  const setCreateTripOpen = useUiStore((state) => state.setCreateTripOpen)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  // Read once: a session stored while the page is open is Auth0's business, not a reason to blink.
  const [storedSession] = useState(hasStoredSession)
  const shell = shellFor(pathname, session.status, storedSession)
  useHomeRedirect(pathname, session.status, storedSession)
  const demo = useDemoStatus()
  const banner = demo === 'active' ? <DemoBanner /> : undefined
  // The demo token ran out: say so on /demo, where the jury can enter again from the link.
  useEffect(() => {
    if (demo === 'expired' && pathname !== '/demo') void navigate({ to: '/demo', replace: true })
  }, [demo, pathname, navigate])
  const language = { locale, onChange: setLocale }
  const envLabel = appEnv === 'main' ? null : appEnv

  return (
    <>
      <HeadContent />
      {shell === 'bare' && <BootScreen />}
      {shell === 'standalone' && <Outlet />}
      {shell === 'public' && (
        <PublicShell
          status={session.status}
          language={language}
          theme={{ theme, resolved, onChange: setTheme }}
          envLabel={envLabel}
          onLogin={session.login}
          onSignup={session.signup}
          banner={banner}
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
            showPlanning: adminAccess.level !== 'NONE',
            onLogin: session.login,
            onLogout: session.logout,
          }}
          language={language}
          theme={{ theme, resolved, onChange: setTheme }}
          envLabel={envLabel}
          banner={banner}
          onCreateTrip={() => {
            // Creating a trip needs an account; ask guests to sign in first.
            if (session.status === 'anonymous') return session.login()
            void navigate({ to: '/trips', search: true })
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
