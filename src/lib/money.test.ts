import { describe, expect, it } from 'vitest'
import {
  allocate,
  centsToDecimal,
  compareDecimals,
  parseDecimalInput,
  sumDecimals,
  toCents,
} from './money'

describe('parseDecimalInput', () => {
  it.each([
    ['12,5', '12.5'],
    ['1 200,50', '1200.50'],
    ['007.10', '7.10'],
    ['0,05', '0.05'],
  ])('reads %s', (input, expected) => expect(parseDecimalInput(input)).toBe(expected))

  it('enforces the integer digit limit', () => {
    expect(parseDecimalInput('1234567890,12', 2, 10)).toBe('1234567890.12')
    expect(parseDecimalInput('12345678901', 2, 10)).toBeNull()
    expect(parseDecimalInput('1234567', 4, 6)).toBeNull()
  })

  it.each(['', 'abc', '1,234', '1.2.3', '--1'])('rejects %s', (input) =>
    expect(parseDecimalInput(input)).toBeNull(),
  )
})

describe('cents', () => {
  it('round-trips without floats', () => {
    expect(toCents('0.10')).toBe(10n)
    expect(toCents('19.99')).toBe(1999n)
    expect(toCents('-3.5')).toBe(-350n)
    expect(centsToDecimal(1999n)).toBe('19.99')
    expect(centsToDecimal(-5n)).toBe('-0.05')
  })
})

describe('decimal sums', () => {
  it('adds exactly', () => {
    expect(sumDecimals(['0.1', '0.2'])).toBe('0.3')
    expect(sumDecimals(['33.33', '33.33', '33.34'])).toBe('100.00')
    expect(sumDecimals([])).toBe('0')
    expect(compareDecimals('100', '100.00')).toBe(0)
    expect(compareDecimals('99.99', '100')).toBe(-1)
  })
})

describe('allocate (the backend split, to the cent)', () => {
  const [a, b, c] = [
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
  ] as const

  it('splits 100.00 equally on three: the first id takes the extra cent', () => {
    const parts = allocate(
      10000n,
      'equal',
      [a, b, c].map((profileId) => ({ profileId, value: null })),
    )
    expect([...parts.values()]).toEqual([3334n, 3333n, 3333n])
  })

  it('splits by percent and keeps the total', () => {
    const parts = allocate(1001n, 'percent', [
      { profileId: a, value: '33.33' },
      { profileId: b, value: '33.33' },
      { profileId: c, value: '33.34' },
    ])
    expect([...parts.values()].reduce((x, y) => x + y)).toBe(1001n)
  })

  it('splits by weights, ties by the lower id', () => {
    const parts = allocate(500n, 'weights', [
      { profileId: b, value: '1' },
      { profileId: a, value: '1' },
      { profileId: c, value: '1' },
    ])
    expect(parts.get(a)).toBe(167n)
    expect(parts.get(b)).toBe(167n)
    expect(parts.get(c)).toBe(166n)
  })

  it('handles fractional weights', () => {
    const parts = allocate(1000n, 'weights', [
      { profileId: a, value: '1.5' },
      { profileId: b, value: '0.5' },
    ])
    expect(parts.get(a)).toBe(750n)
    expect(parts.get(b)).toBe(250n)
  })
})
