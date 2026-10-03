/**
 * Where to go after Auth0 sends the user back: the page the login started from
 * (`appState.returnTo`). Only same-origin paths count; anything else, like a
 * `//host` or a full URL, falls back to the trips list.
 */
export function returnToPath(value: unknown): string {
  if (typeof value !== 'string') return '/trips'
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/trips'
  return value
}
