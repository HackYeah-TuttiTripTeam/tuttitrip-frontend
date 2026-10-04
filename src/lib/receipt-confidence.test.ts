import { describe, expect, it } from 'vitest'
import { uncertainFields } from './receipt-confidence'

const draft = { category: 'food' as const, description: 'Biedronka' }

describe('uncertainFields', () => {
  it('marks nothing on a sure reading with all values', () => {
    expect([...uncertainFields(draft, false, [])]).toEqual([])
  })

  it('always marks a missing category', () => {
    expect([...uncertainFields({ ...draft, category: null }, false, [])]).toEqual(['category'])
  })

  it('marks the fields the reasons name', () => {
    const marked = uncertainFields(draft, true, ['The total is blurred', 'Currency not printed'])
    expect(new Set(marked)).toEqual(new Set(['amount', 'currency']))
  })

  it('marks Polish reasons too', () => {
    expect(new Set(uncertainFields(draft, true, ['Niewyraźna data']))).toEqual(new Set(['spentOn']))
  })

  it('marks the money and the date when the reasons name no field', () => {
    expect(new Set(uncertainFields(draft, true, ['Low confidence']))).toEqual(
      new Set(['amount', 'spentOn']),
    )
  })
})
