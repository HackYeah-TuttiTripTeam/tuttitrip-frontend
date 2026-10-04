import { describe, expect, it } from 'vitest'
import type { Member } from '@/api/queries/members'
import type { Profile } from '@/api/queries/profiles'
import { buildUpdate, editDefaults, joinPeople } from './people'

const profile = (id: string, overrides: Partial<Profile> = {}): Profile => ({
  id,
  trip_id: 't',
  display_name: id,
  age: 6,
  age_group: 'child',
  user_sub: null,
  weight: 1,
  segment_km: 1,
  daily_km: 4,
  active_min: 300,
  stairs_sensitivity: 0.6,
  queue_patience_min: 15,
  nap_start: '13:00:00',
  nap_minutes: 60,
  floor: 30,
  customized_fields: [],
  ...overrides,
})

describe('joinPeople', () => {
  it('puts hosts first and keeps people without an account last', () => {
    const member = (profile_id: string, role: Member['role']): Member => ({
      profile_id,
      role,
      display_name: profile_id,
      status: 'confirmed',
      is_me: false,
    })
    const people = joinPeople(
      [profile('kid'), profile('mem'), profile('host')],
      [member('mem', 'member'), member('host', 'host')],
    )
    expect(people.map((p) => p.profile.id)).toEqual(['host', 'mem', 'kid'])
    expect(people.map((p) => p.role)).toEqual(['host', 'member', null])
  })
})

describe('buildUpdate', () => {
  const kid = profile('kid')

  it('sends nothing when nothing changed', () => {
    expect(buildUpdate(kid, editDefaults(kid))).toEqual({})
  })

  it('sends only the corrected fields and reports them', () => {
    const body = buildUpdate(kid, { ...editDefaults(kid), daily_km: 6, floor: 40 })
    expect(body).toEqual({ daily_km: 6, floor: 40 })
  })

  it('a renamed person is not a corrected comfort value', () => {
    expect(buildUpdate(kid, { ...editDefaults(kid), display_name: 'Kasia' })).toEqual({
      display_name: 'Kasia',
    })
  })

  it('turns hours into minutes and "no nap" into a null start', () => {
    const body = buildUpdate(kid, {
      ...editDefaults(kid),
      active_hours: 6,
      nap_minutes: 0,
    })
    expect(body).toEqual({ active_min: 360, nap_start: null, nap_minutes: 0 })
  })
})
