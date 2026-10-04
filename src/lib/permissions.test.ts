import { describe, expect, it } from 'vitest'
import type { FeatureNode, Me } from '@/api/queries/permissions'
import {
  flattenFeatures,
  grantsToMap,
  inheritedLevel,
  mapToGrants,
  pageOf,
  panelAccess,
  roleFormSchema,
  withLevel,
} from './permissions'

const tree: FeatureNode = {
  code: '*',
  description: 'Wszystko',
  children: [
    {
      code: 'trips',
      description: 'Wyjazdy',
      children: [{ code: 'trips.core', description: 'Dane', children: [] }],
    },
  ],
}

const me = (patch: Partial<Me>): Me => ({
  sub: 'x',
  scopes: [],
  permissions: [],
  roles: [],
  is_admin: false,
  access: {},
  ...patch,
})

describe('panelAccess', () => {
  it('reads the level from the API answer', () => {
    expect(panelAccess(undefined)).toBe('NONE')
    expect(panelAccess(me({}))).toBe('NONE')
    expect(panelAccess(me({ access: { 'admin.permissions': 'READ' } }))).toBe('READ')
    expect(panelAccess(me({ access: { 'admin.permissions': 'WRITE' } }))).toBe('WRITE')
    expect(panelAccess(me({ is_admin: true }))).toBe('WRITE')
  })
})

describe('feature grants', () => {
  it('flattens the tree with depth and ancestors', () => {
    expect(flattenFeatures(tree).map((row) => [row.code, row.depth, row.ancestors])).toEqual([
      ['*', 0, []],
      ['trips', 1, ['*']],
      ['trips.core', 2, ['*', 'trips']],
    ])
  })

  it('shows the grant a leaf inherits from above, the strongest one', () => {
    const leaf = flattenFeatures(tree)[2]
    if (!leaf) throw new Error('no leaf')
    const grants = grantsToMap([
      { feature: '*', level: 'READ' },
      { feature: 'trips', level: 'WRITE' },
    ])
    expect(inheritedLevel(leaf, grants)).toEqual({ from: 'trips', level: 'WRITE' })
    expect(inheritedLevel(leaf, grantsToMap([]))).toBeNull()
  })

  it('sets and clears a level without touching the original map', () => {
    const start = grantsToMap([{ feature: 'trips', level: 'READ' }])
    const next = withLevel(withLevel(start, 'trips.core', 'WRITE'), 'trips', 'NONE')
    expect(mapToGrants(next)).toEqual([{ feature: 'trips.core', level: 'WRITE' }])
    expect(mapToGrants(start)).toEqual([{ feature: 'trips', level: 'READ' }])
  })
})

describe('pageOf', () => {
  const all = Array.from({ length: 25 }, (_, i) => i)

  it('slices one page and counts the rest', () => {
    expect(pageOf(all, 2, 10)).toEqual({ items: all.slice(10, 20), total: 25, pages: 3 })
  })

  it('serves the last page for a page past the end, and nothing for an empty list', () => {
    expect(pageOf(all, 9, 10).items).toEqual(all.slice(20))
    expect(pageOf([], 1, 10)).toEqual({ items: [], total: 0, pages: 0 })
  })
})

describe('roleFormSchema', () => {
  it('follows the API rules for the name', () => {
    const ok = (name: string) => roleFormSchema.safeParse({ name, description: '' }).success
    expect(ok('moderator')).toBe(true)
    expect(ok('Moderator')).toBe(false)
    expect(ok('1role')).toBe(false)
    expect(ok('a')).toBe(false)
  })
})
