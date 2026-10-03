import { type AppState, Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { authConfig } from '@/lib/env'
import { getLocale, syncDocumentLanguage } from '@/lib/i18n'
import { registerServiceWorker } from '@/lib/pwa'
import { queryClient } from '@/lib/query-client'
import { router } from './router'
import '@/styles/index.css'

syncDocumentLanguage()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Missing #root element')

const app = (
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
)

// Auth0 redirects back with ?code=&state= (or ?error=&state=). The router would
// redirect / -> /trips and drop those params before Auth0Provider reads them, so on
// a callback the app waits until Auth0 has handled it.
const isAuthCallback =
  /[?&](code|error)=/.test(window.location.search) && /[?&]state=/.test(window.location.search)

function AfterAuthCallback() {
  const { isLoading } = useAuth0()
  return isAuthCallback && isLoading ? null : app
}

const onRedirectCallback = (appState?: AppState) => {
  router.history.replace(typeof appState?.returnTo === 'string' ? appState.returnTo : '/trips')
}

createRoot(rootElement).render(
  <StrictMode>
    {authConfig ? (
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

registerServiceWorker()
