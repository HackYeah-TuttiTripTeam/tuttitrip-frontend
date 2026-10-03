/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH0_DOMAIN?: string
  readonly VITE_AUTH0_CLIENT_ID?: string
  readonly VITE_AUTH0_AUDIENCE?: string
  /** `1` only in `pnpm dev:mock`; ignored outside `vite dev`. */
  readonly VITE_API_MOCK?: string
  /** Set by CI: main, develop or the branch slug. */
  readonly VITE_APP_ENV?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
