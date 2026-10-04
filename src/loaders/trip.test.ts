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

  it('reads the accommodation tab and the checked offer', () => {
    const offer = '3f0c2a52-6d0b-4a39-8f0e-7a7c9a1c0b11'
    expect(tripSearchSchema.parse({ tab: 'accommodation', offer })).toMatchObject({
      tab: 'accommodation',
      offer,
    })
    expect(tripSearchSchema.parse({ offer: 'not-a-uuid' }).offer).toBeUndefined()
  })

  it('defaults the decision log to the newest page and drops a bad kind', () => {
    expect(tripSearchSchema.parse({})).toMatchObject({ page: 1, sort: 'created_at', dir: 'desc' })
    expect(tripSearchSchema.parse({ decision: 'must' }).decision).toBe('must')
    expect(tripSearchSchema.parse({ decision: 'nope' }).decision).toBeUndefined()
  })
})
