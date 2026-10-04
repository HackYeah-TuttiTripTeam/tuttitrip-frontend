/// <reference types="vite/client" />

/** `pnpm dev:mock`: the API is MSW and the user a fake one. Defined in vite.config.ts. */
declare const __API_MOCK__: boolean

interface ImportMetaEnv {
  readonly VITE_AUTH0_DOMAIN?: string
  readonly VITE_AUTH0_CLIENT_ID?: string
  readonly VITE_AUTH0_AUDIENCE?: string
  /** Browser key of Maps JavaScript API and Places UI Kit (restricted by referrer in Google Cloud). */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  /** Map ID of the vector map (AdvancedMarker needs one). */
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string
  /** `1` only in `pnpm dev:mock`; ignored outside `vite dev`. */
  readonly VITE_API_MOCK?: string
  /** Set by CI: main, develop or the branch slug. */
  readonly VITE_APP_ENV?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
