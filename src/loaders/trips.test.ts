import { describe, expect, it } from 'vitest'
import { tripsApiQuery } from '@/api/queries/trips'
import { tripsSearchSchema } from './trips'

const parse = (input: Record<string, unknown>) => tripsSearchSchema.parse(input)

describe('tripsApiQuery', () => {
  it('sends paging and sort, and leaves empty filters out', () => {
    expect(tripsApiQuery(parse({}))).toEqual({
      page: 1,
      size: 20,
      sort: 'created_at',
      dir: 'desc',
      q: undefined,
      role: undefined,
    })
  })

  it('trims q, keeps roles and the other filters', () => {
    const query = tripsApiQuery(
      parse({ q: '  Gdańsk ', role: ['host', 'member'], city: 'gdansk', kind: 'trip' }),
    )
    expect(query).toMatchObject({
      q: 'Gdańsk',
      role: ['host', 'member'],
      city: 'gdansk',
      kind: 'trip',
    })
  })
})

describe('tripsSearchSchema', () => {
  it('reads a single role and falls back on a bad one', () => {
    expect(parse({ role: 'host' }).role).toEqual(['host'])
    expect(parse({ role: ['boss'] }).role).toEqual([])
  })

  it('drops start_to when it is before start_from', () => {
    const search = parse({ start_from: '2026-11-10', start_to: '2026-11-01' })
    expect(search.start_from).toBe('2026-11-10')
    expect(search.start_to).toBeUndefined()
    expect(parse({ start_from: '2026-11-01', start_to: '2026-11-01' }).start_to).toBe('2026-11-01')
  })
})
