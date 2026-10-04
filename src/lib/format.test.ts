import { afterEach, describe, expect, it, vi } from 'vitest'
import { overwriteGetLocale } from '@/paraglide/runtime'
import {
  compareText,
  formatClock,
  formatDate,
  formatDateRange,
  formatDayMonth,
  formatDecimal,
  formatDuration,
  formatMoney,
  formatNumber,
  formatSigned,
  formatSignedDecimal,
  formatSignedMinutes,
  formatTime,
  lowerCase,
} from './format'

const useLocale = (locale: 'pl' | 'en') => overwriteGetLocale(() => locale)

afterEach(() => vi.useRealTimers())

describe('format', () => {
  it('writes amounts per language', () => {
    useLocale('pl')
    expect(formatMoney(1240)).toBe('1\u00a0240\u00a0zł')
    expect(formatMoney(12.5)).toBe('12,50\u00a0zł')
    useLocale('en')
    expect(formatMoney(1240)).toBe('PLN\u00a01,240')
  })

  it('writes numbers per language', () => {
    useLocale('pl')
    expect(formatNumber(0.87)).toBe('0,87')
    useLocale('en')
    expect(formatNumber(0.87)).toBe('0.87')
  })

  it('writes dates without a year in the current year', () => {
    vi.useFakeTimers({ now: new Date('2026-10-01T12:00:00') })
    useLocale('pl')
    expect(formatDate('2026-10-03T10:00:00')).toBe('sob 3 paź')
    useLocale('en')
    expect(formatDate('2026-10-03T10:00:00')).toBe('Sat, Oct 3')
  })

  it('adds the year for other years', () => {
    vi.useFakeTimers({ now: new Date('2026-10-01T12:00:00') })
    useLocale('pl')
    expect(formatDate('2025-10-04T10:00:00')).toBe('sob 4 paź 2025')
    useLocale('en')
    expect(formatDate('2025-10-04T10:00:00')).toBe('Sat, Oct 4, 2025')
  })

  it('writes times per language', () => {
    useLocale('pl')
    expect(formatTime('2026-10-03T09:30:00')).toBe('09:30')
    useLocale('en')
    expect(formatTime('2026-10-03T09:30:00')).toBe('9:30 AM')
  })

  it('sorts and lower-cases by language rules', () => {
    useLocale('pl')
    expect(['Zakopane', 'Łódź', 'Lublin'].sort(compareText)).toEqual(['Lublin', 'Łódź', 'Zakopane'])
    expect(lowerCase('ŁÓDŹ')).toBe('łódź')
  })

  it('writes a date range from date-only values', () => {
    vi.useFakeTimers({ now: new Date('2026-10-01T12:00:00') })
    useLocale('pl')
    expect(formatDateRange('2026-10-03', '2026-10-06')).toBe('sob 3 paź – wt 6 paź')
    expect(formatDateRange('2026-10-03', '2026-10-03')).toBe('sob 3 paź')
    expect(formatDateRange('2026-10-03', null)).toBe('sob 3 paź')
    expect(formatDateRange(null, null)).toBeNull()
    useLocale('en')
    expect(formatDateRange('2026-10-03', '2026-10-06')).toBe('Sat, Oct 3 – Tue, Oct 6')
  })
})

describe('plan formats', () => {
  it('formats decimal strings without a float in between', () => {
    useLocale('pl')
    expect(formatDecimal('575.00')).toBe('575 zł')
    expect(formatDecimal('12.50')).toBe('12,50 zł')
    expect(formatDecimal('0.30')).toBe('0,30 zł')
    // 2^53 + 1 does not survive a Number.
    expect(formatDecimal('9007199254740993.10')).toBe('9 007 199 254 740 993,10 zł')
    useLocale('en')
    expect(formatDecimal('1240.00', 'PLN')).toBe('PLN 1,240')
    expect(formatDecimal('9.99', 'EUR')).toBe('€9.99')
  })

  it('writes API times of day per language', () => {
    useLocale('pl')
    expect(formatClock('09:30:00')).toBe('09:30')
    useLocale('en')
    expect(formatClock('15:00:00').replace(/\s/g, ' ')).toBe('3:00 PM')
  })

  it('writes a short day and month', () => {
    useLocale('pl')
    expect(formatDayMonth(`${new Date().getFullYear()}-09-20T09:00:00Z`)).toBe('20 wrz')
  })
  it('formats zero, negative and durations', () => {
    useLocale('pl')
    expect(formatDecimal('0.00')).toBe('0\u00a0zł')
    expect(formatDecimal('-12.50')).toBe('-12,50\u00a0zł')
    expect(formatDuration(120)).toBe('2 h')
    expect(formatDuration(90)).toBe('1 h 30 min')
    expect(formatDuration(45)).toBe('45 min')
  })

  it('writes a verification date in UTC, whatever the time zone', () => {
    useLocale('pl')
    expect(formatDayMonth(`${new Date().getFullYear()}-09-20T00:30:00Z`)).toBe('20 wrz')
  })
})

describe('signed formats', () => {
  it('writes a change with its sign, a real minus and no sign for zero', () => {
    useLocale('pl')
    expect(formatSigned(0.04)).toBe('+0,04')
    expect(formatSigned(-0.04)).toBe('−0,04')
    expect(formatSigned(0)).toBe('0')
    expect(formatSignedDecimal('120.00')).toMatch(/^\+120\szł$/)
    expect(formatSignedDecimal('-45.50')).toMatch(/^−45,50\szł$/)
    expect(formatSignedMinutes(25)).toBe('+25 min')
    expect(formatSignedMinutes(-65)).toBe('−1 h 5 min')
    expect(formatSignedMinutes(0)).toBe('0 min')
  })
})
