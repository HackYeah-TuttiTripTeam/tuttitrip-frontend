import { describe, expect, it } from 'vitest'
import { tripSearchDefaults, tripSearchSchema } from './trip'

describe('tripSearchSchema', () => {
  it('opens the interview by default', () => {
    expect(tripSearchSchema.parse({})).toEqual(tripSearchDefaults)
  })

  it('keeps a valid tab', () => {
    expect(tripSearchSchema.parse({ tab: 'plan' }).tab).toBe('plan')
    expect(tripSearchSchema.parse({ tab: 'people' }).tab).toBe('people')
    expect(tripSearchSchema.parse({ tab: 'photos' }).tab).toBe('photos')
    expect(tripSearchSchema.parse({ tab: 'locations' }).tab).toBe('locations')
  })

  it('falls back to the default for a bad tab instead of throwing', () => {
    expect(tripSearchSchema.parse({ tab: 'nope' }).tab).toBe('interview')
    expect(tripSearchSchema.parse({ tab: 7 }).tab).toBe('interview')
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
    expect(parsed).toEqual(tripSearchDefaults)
  })

  it('keeps the vote summary state and drops bad values', () => {
    expect(
      tripSearchSchema.parse({ vpage: 3, vsort: 'veto', vsource: 'link', vveto: true }),
    ).toMatchObject({ vpage: 3, vsort: 'veto', vsource: 'link', vveto: true })
    expect(tripSearchSchema.parse({ vpage: 0, vsort: 'x', vsource: 'x', vveto: false })).toEqual(
      tripSearchDefaults,
    )
  })
})
