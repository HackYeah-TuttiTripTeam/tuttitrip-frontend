import { beforeEach, describe, expect, it } from 'vitest'
import { overwriteGetLocale } from '@/paraglide/runtime'
import { formatAgo } from './format'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString()

describe('formatAgo', () => {
  beforeEach(() => overwriteGetLocale(() => 'en'))

  it('counts minutes, then hours, then days', () => {
    expect(formatAgo(minutesAgo(5), NOW)).toBe('5 min. ago')
    expect(formatAgo(minutesAgo(180), NOW)).toBe('3 hr. ago')
    expect(formatAgo(minutesAgo(3 * 24 * 60), NOW)).toBe('3 days ago')
  })

  it('says "this minute" within the same minute', () => {
    expect(formatAgo(minutesAgo(0), NOW)).toBe('this minute')
  })

  it('speaks Polish when the locale is Polish', () => {
    overwriteGetLocale(() => 'pl')
    expect(formatAgo(minutesAgo(5), NOW)).toMatch(/5 min temu/)
  })
})
