/// <reference types="vite/client" />

/** `pnpm dev:mock`: the API is MSW and the user a fake one. Defined in vite.config.ts. */
declare const __API_MOCK__: boolean

interface ImportMetaEnv {
  readonly VITE_AUTH0_DOMAIN?: string
  readonly VITE_AUTH0_CLIENT_ID?: string
  readonly VITE_AUTH0_AUDIENCE?: string
  /** `1` only in `pnpm dev:mock`; ignored outside `vite dev`. */
  readonly VITE_API_MOCK?: string
  /** How long fetched data counts as fresh, in ms. */
  readonly VITE_QUERY_STALE_MS?: string
  /** How often an open tab checks for a new service worker, in ms. */
  readonly VITE_PWA_UPDATE_CHECK_MS?: string
  /** Set by CI: main, develop or the branch slug. */
  readonly VITE_APP_ENV?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
