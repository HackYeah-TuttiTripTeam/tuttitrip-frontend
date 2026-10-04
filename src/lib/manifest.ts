// The web manifest in the language of a request. The build emits one manifest (Polish, the
// base locale: icons, colors, scope). The Worker serves it per language (worker/index.ts)
// by swapping the four fields the user reads on the install screen.
import { m } from '../paraglide/messages'
import type { Locale } from '../paraglide/runtime'

export const MANIFEST_PATH = '/manifest.webmanifest'

export function localizedManifest<T extends Record<string, unknown>>(base: T, locale: Locale) {
  return {
    ...base,
    // The product name is the same in every language.
    description: m.app_description({}, { locale }),
    lang: locale,
  }
}
