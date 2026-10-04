import type { SessionStatus } from '@/hooks/use-session'

/** Pages open to guests; they use the public layout instead of the app shell. */
const PUBLIC_PATHS = new Set(['/', '/about', '/contact', '/prywatnosc'])

/** "standalone" is /demo: the page draws all of itself, so no header flashes sign-in buttons. */
export type ShellKind = 'public' | 'bare' | 'standalone' | 'app'

const trimmed = (pathname: string) =>
  pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

/**
 * `/` for someone who is signed in and is being sent on, or whose session is still loading and
 * might turn out to be signed in. A browser that stores no session (`storedSession` false, see
 * lib/session-hint.ts) is a guest already, so the landing page need not wait for Auth0: that
 * wait would hold back the first paint of the page every new visitor lands on.
 */
export function isHomeWaiting(
  pathname: string,
  status: SessionStatus,
  storedSession = true,
): boolean {
  if (trimmed(pathname) !== '/') return false
  return status === 'authenticated' || (status === 'loading' && storedSession)
}

/**
 * Which chrome wraps a page. "bare" is the waiting `/` (see isHomeWaiting): no header and no
 * landing page, so neither flashes before the redirect to /trips.
 */
export function shellFor(pathname: string, status: SessionStatus, storedSession = true): ShellKind {
  if (trimmed(pathname) === '/demo') return 'standalone'
  if (!PUBLIC_PATHS.has(trimmed(pathname))) return 'app'
  return isHomeWaiting(pathname, status, storedSession) ? 'bare' : 'public'
}
