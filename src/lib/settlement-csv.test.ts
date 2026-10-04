import { describe, expect, it } from 'vitest'
import { transfersToCsv } from './settlement-csv'

describe('transfersToCsv', () => {
  it('writes the four columns with a decimal point and quotes what needs it', () => {
    const csv = transfersToCsv(
      [{ from_profile_id: 'a', to_profile_id: 'b', amount: '33.34' }],
      'PLN',
      (id) => (id === 'a' ? 'Ola' : 'Marek, "Tata"'),
      ['osoba', 'odbiorca', 'kwota', 'waluta'],
    )
    expect(csv).toBe('\ufeffosoba,odbiorca,kwota,waluta\r\nOla,"Marek, ""Tata""",33.34,PLN\r\n')
  })

  it.each([
    ['=cmd()', "'=cmd()"],
    ['+1', "'+1"],
    ['-1', "'-1"],
    ['@SUM(A1)', "'@SUM(A1)"],
  ])('defuses a name that starts a formula: %s', (name, cell) => {
    const csv = transfersToCsv(
      [{ from_profile_id: 'a', to_profile_id: 'b', amount: '5.00' }],
      'PLN',
      (id) => (id === 'a' ? name : 'Marek'),
      ['osoba', 'odbiorca', 'kwota', 'waluta'],
    )
    expect(csv.split('\r\n')[1]).toBe(`${cell.includes(',') ? `"${cell}"` : cell},Marek,5.00,PLN`)
  })

  it('defuses a leading tab and quotes cells with tabs', () => {
    const csv = transfersToCsv(
      [{ from_profile_id: 'a', to_profile_id: 'b', amount: '5.00' }],
      'PLN',
      (id) => (id === 'a' ? '\tOla' : 'Ma\trek'),
      ['osoba', 'odbiorca', 'kwota', 'waluta'],
    )
    expect(csv.split('\r\n')[1]).toBe('"\'\tOla","Ma\trek",5.00,PLN')
  })

  it('leaves the amount column numeric and writes an empty currency when there is none', () => {
    const csv = transfersToCsv(
      [{ from_profile_id: 'a', to_profile_id: 'b', amount: '1200.50' }],
      null,
      () => 'Ola',
      ['osoba', 'odbiorca', 'kwota', 'waluta'],
    )
    expect(csv.split('\r\n')[1]).toBe('Ola,Ola,1200.50,')
  })
})
