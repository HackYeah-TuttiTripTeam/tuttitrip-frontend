import { describe, expect, it } from 'vitest'
import { tripSearchSchema } from './trip'

describe('tripSearchSchema', () => {
  it('opens the interview by default', () => {
    expect(tripSearchSchema.parse({})).toMatchObject({ tab: 'interview' })
  })

  it('keeps a valid tab', () => {
    expect(tripSearchSchema.parse({ tab: 'plan' })).toMatchObject({ tab: 'plan' })
    expect(tripSearchSchema.parse({ tab: 'people' })).toMatchObject({ tab: 'people' })
  })

  it('falls back to the default for a bad tab instead of throwing', () => {
    expect(tripSearchSchema.parse({ tab: 'nope' })).toMatchObject({ tab: 'interview' })
    expect(tripSearchSchema.parse({ tab: 7 })).toMatchObject({ tab: 'interview' })
  })

  it('reads the expenses list params and falls back for nonsense', () => {
    expect(
      tripSearchSchema.parse({ tab: 'expenses', section: 'settlement', page: 2, sort: 'amount' }),
    ).toMatchObject({ tab: 'expenses', section: 'settlement', page: 2, sort: 'amount' })
    expect(
      tripSearchSchema.parse({ section: 'x', page: 'abc', sort: 'name', size: 7 }),
    ).toMatchObject({ section: 'list', page: 1, sort: 'spent_on', size: 20 })
  })
})
