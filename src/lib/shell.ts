import type { SessionStatus } from '@/hooks/use-session'

/** Pages open to guests; they use the public layout instead of the app shell. */
const PUBLIC_PATHS = new Set(['/', '/about', '/contact'])

export type ShellKind = 'public' | 'bare' | 'app'

/**
 * Which chrome wraps a page. "bare" is `/` while the session loads or the redirect to
 * /trips runs: no header yet, so neither the landing page nor a shell flashes.
 */
export function shellFor(pathname: string, status: SessionStatus): ShellKind {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (!PUBLIC_PATHS.has(path)) return 'app'
  if (path === '/' && (status === 'loading' || status === 'authenticated')) return 'bare'
  return 'public'
}
