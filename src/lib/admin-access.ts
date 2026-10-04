import type { Me } from '@/api/queries/me'

export type AdminLevel = 'NONE' | 'READ' | 'WRITE'

/**
 * What the signed-in person may do with accounts, exactly as `GET /me` says (an administrator,
 * or a grant on `admin.users`). The UI never infers it from a role name or a guess.
 */
export function adminUsersAccess(me: Me | undefined): AdminLevel {
  if (!me) return 'NONE'
  if (me.is_admin) return 'WRITE'
  return me.access['admin.users'] ?? 'NONE'
}
