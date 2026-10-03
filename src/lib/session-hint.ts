// Auth0 keeps its tokens in localStorage (cacheLocation in main.tsx) under keys with this prefix.
const AUTH0_PREFIX = '@@auth0spajs@@'

/**
 * Whether this browser holds a session from an earlier visit. No stored session means Auth0 can
 * only answer "guest" (apart from a single sign-on cookie, which then redirects as before), so the
 * landing page does not have to wait for it. Unreadable storage counts as "maybe signed in".
 */
export function hasStoredSession(): boolean {
  try {
    for (let index = 0; index < localStorage.length; index++) {
      if (localStorage.key(index)?.startsWith(AUTH0_PREFIX)) return true
    }
    return false
  } catch {
    return true
  }
}
