import { describe, expect, it } from 'vitest'
import { tripSearchSchema } from './trip'

describe('tripSearchSchema', () => {
  it('opens the interview by default', () => {
    expect(tripSearchSchema.parse({})).toEqual({ tab: 'interview' })
  })

  it('keeps a valid tab', () => {
    expect(tripSearchSchema.parse({ tab: 'plan' })).toEqual({ tab: 'plan' })
    expect(tripSearchSchema.parse({ tab: 'people' })).toEqual({ tab: 'people' })
  })

  it('falls back to the default for a bad tab instead of throwing', () => {
    expect(tripSearchSchema.parse({ tab: 'nope' })).toEqual({ tab: 'interview' })
    expect(tripSearchSchema.parse({ tab: 7 })).toEqual({ tab: 'interview' })
  })
})
