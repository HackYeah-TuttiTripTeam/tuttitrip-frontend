import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { AppShell } from '@/components/shared/app-shell'
import { BootScreen } from '@/components/shared/boot-screen'
import { PublicShell } from '@/components/shared/public-shell'
import { useApiAuthBridge } from '@/hooks/use-api-auth-bridge'
import { useHomeRedirect } from '@/hooks/use-home-redirect'
import { useLocale } from '@/hooks/use-locale'
import { useSession } from '@/hooks/use-session'
import { useTheme } from '@/hooks/use-theme'
import { appEnv } from '@/lib/env'
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
  const session = useSession()
  const { locale, setLocale } = useLocale()
  const { theme, resolved, setTheme } = useTheme()
  const setCreateTripOpen = useUiStore((state) => state.setCreateTripOpen)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const shell = shellFor(pathname, session.status)
  useHomeRedirect(pathname, session.status)
  const language = { locale, onChange: setLocale }
  const envLabel = appEnv === 'main' ? null : appEnv

  return (
    <>
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
          theme={{ theme, resolved, onChange: setTheme }}
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
