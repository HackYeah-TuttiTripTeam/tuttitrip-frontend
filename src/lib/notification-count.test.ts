import { describe, expect, it } from 'vitest'
import { notification } from '@/mocks/fixtures'
import { guessUnreadCount } from './notification-count'

const unread = notification({ id: 'a' })
const read = notification({ id: 'b', read_at: '2026-10-04T10:00:00Z' })

describe('guessUnreadCount', () => {
  it('takes the unread ones among the ids off the counter', () => {
    expect(guessUnreadCount(3, { read: true, ids: ['a', 'b'] }, [unread, read])).toBe(2)
  })

  it('adds back the read ones marked unread', () => {
    expect(guessUnreadCount(3, { read: false, ids: ['a', 'b'] }, [unread, read])).toBe(4)
  })

  it('never goes below zero', () => {
    expect(guessUnreadCount(0, { read: true, ids: ['a'] }, [unread])).toBe(0)
  })

  it('leaves it to the server when an id is not in a loaded page', () => {
    expect(guessUnreadCount(3, { read: true, ids: ['a', 'zzz'] }, [unread])).toBeUndefined()
  })

  it('knows "all unread" is zero, and nothing about a narrower filter', () => {
    expect(guessUnreadCount(7, { read: true, filters: { read: false } }, [])).toBe(0)
    expect(guessUnreadCount(7, { read: true, filters: {} }, [])).toBe(0)
    expect(
      guessUnreadCount(7, { read: true, filters: { type: ['plan_ready'] } }, []),
    ).toBeUndefined()
    expect(guessUnreadCount(7, { read: false, filters: {} }, [])).toBeUndefined()
  })
})
