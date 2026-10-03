import type { SessionStatus } from '@/hooks/use-session'

/** Pages open to guests; they use the public layout instead of the app shell. */
const PUBLIC_PATHS = new Set(['/', '/about', '/contact'])

export type ShellKind = 'public' | 'bare' | 'app'

const trimmed = (pathname: string) =>
  pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

/** `/` for someone whose session is still loading or who is signed in and is being sent on. */
export function isHomeWaiting(pathname: string, status: SessionStatus): boolean {
  return trimmed(pathname) === '/' && (status === 'loading' || status === 'authenticated')
}

/**
 * Which chrome wraps a page. "bare" is the waiting `/` (see isHomeWaiting): no header and no
 * landing page, so neither flashes before the redirect to /trips.
 */
export function shellFor(pathname: string, status: SessionStatus): ShellKind {
  if (!PUBLIC_PATHS.has(trimmed(pathname))) return 'app'
  return isHomeWaiting(pathname, status) ? 'bare' : 'public'
}
