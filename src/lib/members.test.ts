import { describe, expect, it } from 'vitest'
import type { Member } from '@/api/queries/members'
import { actionsOn, sortMembers } from './members'

const member = (role: Member['role'], over: Partial<Member> = {}): Member => ({
  profile_id: `${role}-${over.display_name ?? 'x'}`,
  display_name: 'x',
  role,
  status: 'confirmed',
  is_me: false,
  ...over,
})

describe('actionsOn', () => {
  it('lets the host change roles, hand the trip over and remove anyone else', () => {
    expect(actionsOn('host', member('member'))).toEqual({
      setRole: 'co_host',
      transferHost: true,
      remove: true,
    })
    expect(actionsOn('host', member('co_host')).setRole).toBe('member')
  })

  it('lets a co-host remove plain members only, and change no roles', () => {
    expect(actionsOn('co_host', member('member'))).toEqual({
      setRole: null,
      transferHost: false,
      remove: true,
    })
    expect(actionsOn('co_host', member('co_host')).remove).toBe(false)
    expect(actionsOn('co_host', member('host')).remove).toBe(false)
  })

  it('gives a plain member nothing, and nobody an action on the host or themselves', () => {
    expect(actionsOn('member', member('member')).remove).toBe(false)
    expect(actionsOn('host', member('host')).remove).toBe(false)
    expect(actionsOn('host', member('member', { is_me: true })).remove).toBe(false)
  })
})

describe('sortMembers', () => {
  it('puts the host first, then co-hosts, then members, the caller first within a role', () => {
    const sorted = sortMembers([
      member('member', { display_name: 'Zo' }),
      member('member', { display_name: 'Ada', is_me: true }),
      member('host', { display_name: 'Bo' }),
      member('co_host', { display_name: 'Cy' }),
      member('member', { display_name: 'Al' }),
    ])
    expect(sorted.map((entry) => entry.display_name)).toEqual(['Bo', 'Cy', 'Ada', 'Al', 'Zo'])
  })
})
