import { type AppState, Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { authConfig } from '@/lib/env'
import { getLocale, syncDocumentLanguage } from '@/lib/i18n'
import { registerServiceWorker } from '@/lib/pwa'
import { queryClient } from '@/lib/query-client'
import { returnToPath } from '@/lib/return-to'
import type * as MockEntry from '@/mocks/entry'
import { router } from './router'
import '@/styles/index.css'

syncDocumentLanguage()

// `pnpm dev:mock`: MSW answers the API and a fake user is signed in. __API_MOCK__ is replaced by
// a literal at build time (vite.config.ts, the only place the condition is defined), so a
// production build drops this branch and the import with it.
let mock: typeof MockEntry | null = null
if (__API_MOCK__) {
  mock = await import('@/mocks/entry')
  await mock.startMockApi()
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Missing #root element')

const app = (
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
)

// Auth0 redirects back with ?code=&state= (or ?error=&state=). The router could navigate
// away and drop those params before Auth0Provider reads them (a signed-in `/` goes to
// /trips), so on a callback the app waits until Auth0 has handled it.
const isAuthCallback =
  /[?&](code|error)=/.test(window.location.search) && /[?&]state=/.test(window.location.search)

function AfterAuthCallback() {
  const { isLoading } = useAuth0()
  return isAuthCallback && isLoading ? null : app
}

const onRedirectCallback = (appState?: AppState) => {
  router.history.replace(returnToPath(appState?.returnTo))
}

createRoot(rootElement).render(
  <StrictMode>
    {mock ? (
      <mock.MockAuthProvider>{app}</mock.MockAuthProvider>
    ) : authConfig ? (
      <Auth0Provider
        domain={authConfig.domain}
        clientId={authConfig.clientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
          ui_locales: getLocale(),
          audience: authConfig.audience,
        }}
        // Refresh tokens + localStorage keep the session alive in installed PWAs
        // and in Safari, which blocks the third-party cookies silent auth needs.
        useRefreshTokens
        useRefreshTokensFallback
        cacheLocation="localstorage"
        onRedirectCallback={onRedirectCallback}
      >
        <AfterAuthCallback />
      </Auth0Provider>
    ) : (
      app
    )}
  </StrictMode>,
)

// A service worker of the PWA would fight MSW's one over the same scope.
if (!mock) registerServiceWorker()
