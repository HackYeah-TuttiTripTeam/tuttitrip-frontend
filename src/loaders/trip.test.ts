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
    expect(tripSearchSchema.parse({ tab: 'photos' }).tab).toBe('photos')
    expect(tripSearchSchema.parse({ tab: 'locations' }).tab).toBe('locations')
  })

  it('falls back to the default for a bad tab instead of throwing', () => {
    expect(tripSearchSchema.parse({ tab: 'nope' })).toMatchObject({
      tab: 'interview',
      ...VOTE_DEFAULTS,
    })
    expect(tripSearchSchema.parse({ tab: 7 })).toMatchObject({ tab: 'interview', ...VOTE_DEFAULTS })
  })

  it('reads the list parameters of the check-ins, the photos and the plan view', () => {
    const parsed = tripSearchSchema.parse({
      view: 'map',
      ci_page: '2',
      ci_sort: 'room',
      ci_dir: 'desc',
      ci_q: 2026,
      ph_page: 3,
      ph_sort: 'size_bytes',
      ph_dir: 'asc',
      ph_owner: 'mine',
    })
    expect(parsed).toMatchObject({
      view: 'map',
      ci_page: 2,
      ci_sort: 'room',
      ci_dir: 'desc',
      ci_q: '2026',
      ph_page: 3,
      ph_sort: 'size_bytes',
      ph_dir: 'asc',
      ph_owner: 'mine',
    })
  })

  it('falls back per parameter for bad list values', () => {
    const parsed = tripSearchSchema.parse({
      view: 'globe',
      ci_page: 0,
      ci_sort: 'colour',
      ci_dir: 'sideways',
      ph_page: 'x',
      ph_sort: 'name',
      ph_owner: 'everyone',
    })
    expect(parsed).toMatchObject({
      view: 'list',
      ci_page: 1,
      ci_sort: 'accommodation',
      ci_dir: 'asc',
      ph_page: 1,
      ph_sort: 'created_at',
      ph_owner: 'all',
    })
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
