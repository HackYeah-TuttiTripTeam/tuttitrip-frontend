import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { AppShell } from '@/components/shared/app-shell'
import { PublicShell } from '@/components/shared/public-shell'
import { useApiAuthBridge } from '@/hooks/use-api-auth-bridge'
import { useLocale } from '@/hooks/use-locale'
import { useSession } from '@/hooks/use-session'
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
  const setCreateTripOpen = useUiStore((state) => state.setCreateTripOpen)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const shell = shellFor(pathname, session.status)
  const language = { locale, onChange: setLocale }
  const envLabel = appEnv === 'main' ? null : appEnv

  return (
    <>
      {shell === 'bare' && <Outlet />}
      {shell === 'public' && (
        <PublicShell
          visitor={
            session.status === 'anonymous'
              ? 'guest'
              : session.status === 'authenticated'
                ? 'member'
                : 'none'
          }
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
