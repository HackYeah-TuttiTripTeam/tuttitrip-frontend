import { Outlet, useNavigate } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { AppShell } from '@/components/shared/app-shell'
import { useApiAuthBridge } from '@/hooks/use-api-auth-bridge'
import { useSession } from '@/hooks/use-session'
import { appEnv } from '@/lib/env'
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
  const setCreateTripOpen = useUiStore((state) => state.setCreateTripOpen)
  const navigate = useNavigate()

  return (
    <>
      <AppShell
        account={{
          status: session.status,
          userName: session.userName,
          userPicture: session.userPicture,
          onLogin: session.login,
          onLogout: session.logout,
        }}
        envLabel={appEnv === 'main' ? null : appEnv}
        onCreateTrip={() => {
          void navigate({ to: '/trips', search: (prev) => prev })
          setCreateTripOpen(true)
        }}
      >
        <Outlet />
      </AppShell>
      <Suspense>
        <Devtools />
      </Suspense>
    </>
  )
}
