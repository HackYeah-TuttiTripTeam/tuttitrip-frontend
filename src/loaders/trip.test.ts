import { describe, expect, it } from 'vitest'
import { tripSearchSchema } from './trip'

const VOTE_DEFAULTS = { vpage: 1, vsort: 'name' } as const

describe('tripSearchSchema', () => {
  it('opens the interview by default', () => {
    expect(tripSearchSchema.parse({})).toMatchObject({ tab: 'interview', ...VOTE_DEFAULTS })
  })

  it('keeps a valid tab', () => {
    expect(tripSearchSchema.parse({ tab: 'plan' })).toMatchObject({ tab: 'plan', ...VOTE_DEFAULTS })
    expect(tripSearchSchema.parse({ tab: 'people' })).toMatchObject({
      tab: 'people',
      ...VOTE_DEFAULTS,
    })
  })

  it('falls back to the default for a bad tab instead of throwing', () => {
    expect(tripSearchSchema.parse({ tab: 'nope' })).toMatchObject({
      tab: 'interview',
      ...VOTE_DEFAULTS,
    })
    expect(tripSearchSchema.parse({ tab: 7 })).toMatchObject({ tab: 'interview', ...VOTE_DEFAULTS })
  })

  it('keeps the vote summary state and drops bad values', () => {
    expect(
      tripSearchSchema.parse({ vpage: 3, vsort: 'veto', vsource: 'link', vveto: true }),
    ).toMatchObject({ vpage: 3, vsort: 'veto', vsource: 'link', vveto: true })
    expect(
      tripSearchSchema.parse({ vpage: 0, vsort: 'x', vsource: 'x', vveto: false }),
    ).toMatchObject({
      tab: 'interview',
      ...VOTE_DEFAULTS,
    })
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
