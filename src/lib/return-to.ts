const FALLBACK = '/trips'

/**
 * Where to go after Auth0 sends the user back: the page the login started from
 * (`appState.returnTo`). Only same-origin targets count, and the result is reduced to
 * path + search + hash, so a `//host`, a full URL or a string the browser would
 * normalise into another origin (`/\\host`, `/\t/host`) falls back to the trips list.
 */
export function returnToPath(value: unknown, origin = window.location.origin): string {
  if (typeof value !== 'string') return FALLBACK
  let url: URL
  try {
    url = new URL(value, origin)
  } catch {
    return FALLBACK
  }
  if (url.origin !== origin) return FALLBACK
  // The input must itself be a path: "https://same.origin/x" is not what we stored.
  if (!value.startsWith('/') || value.startsWith('//')) return FALLBACK
  return `${url.pathname}${url.search}${url.hash}`
}
