import { describe, expect, it } from 'vitest'
import { tripSearchSchema } from './trip'

const VOTE_DEFAULTS = { vpage: 1, vsort: 'name' } as const

describe('tripSearchSchema', () => {
  it('opens the interview by default', () => {
    expect(tripSearchSchema.parse({})).toEqual({ tab: 'interview', ...VOTE_DEFAULTS })
  })

  it('keeps a valid tab', () => {
    expect(tripSearchSchema.parse({ tab: 'plan' })).toEqual({ tab: 'plan', ...VOTE_DEFAULTS })
    expect(tripSearchSchema.parse({ tab: 'people' })).toEqual({ tab: 'people', ...VOTE_DEFAULTS })
  })

  it('falls back to the default for a bad tab instead of throwing', () => {
    expect(tripSearchSchema.parse({ tab: 'nope' })).toEqual({ tab: 'interview', ...VOTE_DEFAULTS })
    expect(tripSearchSchema.parse({ tab: 7 })).toEqual({ tab: 'interview', ...VOTE_DEFAULTS })
  })

  it('keeps the vote summary state and drops bad values', () => {
    expect(
      tripSearchSchema.parse({ vpage: 3, vsort: 'veto', vsource: 'link', vveto: true }),
    ).toMatchObject({ vpage: 3, vsort: 'veto', vsource: 'link', vveto: true })
    expect(tripSearchSchema.parse({ vpage: 0, vsort: 'x', vsource: 'x', vveto: false })).toEqual({
      tab: 'interview',
      ...VOTE_DEFAULTS,
    })
  })
})
