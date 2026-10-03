import { describe, expect, it } from 'vitest'
import type { Invitation } from '@/api/queries/invitations'
import { invitationStatus } from './invitations'

const now = new Date('2026-10-04T12:00:00Z')
const invitation = (over: Partial<Invitation> = {}): Invitation => ({
  id: 'a',
  trip_id: 't',
  created_by_sub: 'auth0|1',
  created_at: '2026-10-03T12:00:00Z',
  expires_at: '2026-10-10T12:00:00Z',
  max_uses: 10,
  uses: 3,
  revoked_at: null,
  profile_id: null,
  ...over,
})

describe('invitationStatus', () => {
  it('is active before the expiry while uses are left', () => {
    expect(invitationStatus(invitation(), now)).toBe('active')
  })
  it('is expired at and after the expiry', () => {
    expect(invitationStatus(invitation({ expires_at: '2026-10-04T12:00:00Z' }), now)).toBe(
      'expired',
    )
  })
  it('is used up when the limit is reached', () => {
    expect(invitationStatus(invitation({ uses: 10 }), now)).toBe('used_up')
  })
  it('revoked wins over everything', () => {
    const revoked = invitation({
      revoked_at: '2026-10-04T00:00:00Z',
      uses: 10,
      expires_at: '2026-10-01T00:00:00Z',
    })
    expect(invitationStatus(revoked, now)).toBe('revoked')
  })
})
