import { describe, expect, it } from 'vitest'
import { m } from '@/paraglide/messages'
import { overwriteGetLocale } from '@/paraglide/runtime'

describe('messages', () => {
  it('picks the Polish plural form', () => {
    overwriteGetLocale(() => 'pl')
    expect([1, 2, 5, 22, 12].map((count) => m.trips_count({ count }))).toEqual([
      '1 wyjazd',
      '2 wyjazdy',
      '5 wyjazdów',
      '22 wyjazdy',
      '12 wyjazdów',
    ])
  })

  it('picks the English plural form and fills placeholders', () => {
    overwriteGetLocale(() => 'en')
    expect(m.trips_count({ count: 1 })).toBe('1 trip')
    expect(m.list_range({ from: 21, to: 40, total: 134 })).toBe('21 to 40 of 134')
  })

  it('keeps the glossary in both languages', () => {
    overwriteGetLocale(() => 'pl')
    expect(m.verdict_iconic_not_yours()).toBe('Kultowe, ale nie Twoje')
    overwriteGetLocale(() => 'en')
    expect(m.verdict_iconic_not_yours()).toBe('Iconic, but not for you')
  })
})
