import { describe, expect, it } from 'vitest'
import { notificationFilter, notificationsApiQuery } from '@/api/queries/notifications'
import { notificationsSearchSchema } from './notifications'

const parse = (input: Record<string, unknown>) => notificationsSearchSchema.parse(input)

describe('notificationsSearchSchema', () => {
  it('has the defaults of a list and no filters', () => {
    expect(parse({})).toEqual({
      page: 1,
      size: 20,
      sort: 'created_at',
      dir: 'desc',
      read: 'all',
      type: [],
    })
  })

  it('reads a pasted URL', () => {
    expect(parse({ read: 'unread', type: 'veto_added', sort: 'type', dir: 'asc' })).toMatchObject({
      read: 'unread',
      type: ['veto_added'],
      sort: 'type',
      dir: 'asc',
    })
  })

  it('falls back on nonsense and drops a range that ends before it starts', () => {
    expect(parse({ read: 'maybe', type: ['boss'], sort: 'name', trip: 'x', from: 'soon' })).toEqual(
      expect.objectContaining({ read: 'all', type: [], sort: 'created_at', trip: undefined }),
    )
    expect(parse({ from: '2026-10-10', to: '2026-10-01' }).to).toBeUndefined()
  })
})

describe('notificationFilter', () => {
  it('leaves empty filters out', () => {
    expect(notificationFilter(parse({}))).toEqual({})
  })

  it('maps the URL names to the API and the days to UTC moments, the end exclusive', () => {
    const filter = notificationFilter(
      parse({
        read: 'read',
        type: ['plan_ready'],
        trip: crypto.randomUUID(),
        from: '2026-10-01',
        to: '2026-10-03',
      }),
    )
    expect(filter).toMatchObject({ read: true, type: ['plan_ready'] })
    // Local midnight of the first day, and local midnight of the day *after* the last one.
    expect(filter.created_from).toBe(new Date(2026, 9, 1).toISOString())
    expect(filter.created_to).toBe(new Date(2026, 9, 4).toISOString())
  })

  it('sends paging and sort next to the filters', () => {
    expect(notificationsApiQuery(parse({ read: 'unread', page: 2 }))).toEqual({
      page: 2,
      size: 20,
      sort: 'created_at',
      dir: 'desc',
      read: false,
    })
  })
})
