import type { Member } from '@/api/queries/members'

type Role = Member['role']

const RANK: Record<Role, number> = { host: 0, co_host: 1, member: 2 }

/** Hosts first, then co-hosts, then members; the caller first within a role, then by name. */
export function sortMembers(members: readonly Member[]): Member[] {
  return members.toSorted(
    (a, b) =>
      RANK[a.role] - RANK[b.role] ||
      Number(b.is_me) - Number(a.is_me) ||
      a.display_name.localeCompare(b.display_name),
  )
}

export interface MemberActions {
  /** Give or take back the co-host role (the host only). */
  setRole: 'member' | 'co_host' | null
  /** Hand the host role over (the host only; the host stays a co-host). */
  transferHost: boolean
  remove: boolean
}

const NONE: MemberActions = { setRole: null, transferHost: false, remove: false }

/**
 * What the caller may do to another member. A convenience for the buttons: the API enforces the
 * same rules (403/409) and the UI shows its answer when they disagree.
 * Host: roles, host transfer, removal of anyone. Co-host: removal of plain members only.
 */
export function actionsOn(myRole: Role, target: Member): MemberActions {
  if (target.is_me || target.role === 'host') return NONE
  if (myRole === 'host') {
    return {
      setRole: target.role === 'co_host' ? 'member' : 'co_host',
      transferHost: true,
      remove: true,
    }
  }
  if (myRole === 'co_host' && target.role === 'member') return { ...NONE, remove: true }
  return NONE
}
