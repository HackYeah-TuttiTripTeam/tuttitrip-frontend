import { describe, expect, it } from 'vitest'
import { days } from '@/mocks/fixtures'
import { dayCost, dayTickets, familySaving, stopGroupCost, sumDecimals } from './plan-cost'

describe('sumDecimals', () => {
  it('adds in cents without float error', () => {
    expect(sumDecimals(['0.10', '0.20'])).toBe('0.30')
    expect(sumDecimals([])).toBe('0.00')
  })
})

describe('costs of a day', () => {
  const [one, two] = days()
  if (!one || !two) throw new Error('no days')

  it('adds the people lines of a stop, else the price per person times the group', () => {
    const [zamek, , lazienki] = one.items
    if (!zamek || !lazienki) throw new Error('no stops')
    expect(stopGroupCost(zamek, 5)).toBe('90.00')
    expect(stopGroupCost({ ...zamek, price_lines: undefined }, 5)).toBe('150.00')
    expect(stopGroupCost({ ...lazienki, cost_per_person: null }, 5)).toBeNull()
  })

  it('sums the day and skips stops without a price', () => {
    expect(dayCost(one, 5)).toBe('190.63')
    // Kopernik at the family ticket (100) and park at 0; the meal without a price is skipped.
    expect(dayCost(two, 5)).toBe('100.00')
    expect(dayCost({ ...two, items: [] }, 5)).toBeNull()
  })

  it('finds the tickets of one day and the saving of a family ticket', () => {
    const tickets = [
      { day: 1, ticket: 'day' as const, cost: '15.00', verified: false },
      { day: 2, ticket: 'week' as const, cost: '60.00', verified: true },
    ]
    expect(dayTickets(tickets, 2)).toEqual([tickets[1]])
    expect(dayTickets(undefined, 1)).toEqual([])
    const kopernik = two.items[0]
    if (!kopernik) throw new Error('no stop')
    expect(familySaving(kopernik)).toBe('40.00')
    expect(
      familySaving({ ...kopernik, family_ticket: { total: '140.00', singles_total: '140.00' } }),
    ).toBeNull()
  })
})
