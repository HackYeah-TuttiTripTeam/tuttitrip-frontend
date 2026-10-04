import { describe, expect, it } from 'vitest'
import { me } from '@/mocks/fixtures'
import { canEditName, providerOf } from './account'
import { adminUsersAccess } from './admin-access'

describe('providerOf', () => {
  it('reads the provider from the Auth0 user id', () => {
    expect(providerOf('google-oauth2|1')).toBe('google')
    expect(providerOf('discord|1')).toBe('discord')
    expect(providerOf('auth0|1')).toBe('password')
    expect(providerOf('github|1')).toBe('other')
    expect(providerOf(undefined)).toBe('other')
  })

  it('lets only accounts that own their name edit it', () => {
    expect(canEditName('password')).toBe(true)
    expect(canEditName('google')).toBe(false)
    expect(canEditName('discord')).toBe(false)
  })
})

describe('adminUsersAccess', () => {
  it('follows GET /me: administrator, a grant on admin.users, or nothing', () => {
    expect(adminUsersAccess(undefined)).toBe('NONE')
    expect(adminUsersAccess(me())).toBe('NONE')
    expect(adminUsersAccess(me({ is_admin: true }))).toBe('WRITE')
    expect(adminUsersAccess(me({ access: { 'admin.users': 'READ' } }))).toBe('READ')
    expect(adminUsersAccess(me({ roles: ['superadmin'] }))).toBe('NONE')
  })
})
