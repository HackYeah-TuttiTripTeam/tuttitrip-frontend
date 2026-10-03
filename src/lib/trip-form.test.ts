import { describe, expect, it } from 'vitest'
import type { Trip } from '@/api/queries/trips'
import { overwriteGetLocale } from '@/paraglide/runtime'
import { budgetSummary } from './format'
import {
  diffPatch,
  EMPTY_TRIP_FORM,
  effectiveCurrency,
  formValuesToPatch,
  kindFromDates,
  mapValidationErrors,
  moneyToNumber,
  normalizeMoney,
  toCents,
  tripFormSchema,
  tripToFormValues,
} from './trip-form'

overwriteGetLocale(() => 'pl')

const filled = { ...EMPTY_TRIP_FORM, name: 'Majówka' }

const trip = (over: Partial<Trip> = {}): Trip => ({
  id: 'x',
  name: 'Majówka',
  destination: null,
  created_at: '2026-10-01T10:00:00Z',
  start_date: null,
  end_date: null,
  day_start: '09:00:00',
  day_end: '21:00:00',
  city_slug: null,
  currency: null,
  budget_total_min: null,
  budget_total_max: null,
  budget_day_min: null,
  budget_day_max: null,
  budget_flex_pct: 10,
  fairness_alpha: 1,
  my_role: 'host',
  kind: 'trip',
  ...over,
})

const issues = (values: typeof filled) => {
  const result = tripFormSchema.safeParse(values)
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]))
}

describe('money', () => {
  it('keeps amounts as decimal strings', () => {
    expect(normalizeMoney('2000,5')).toBe('2000.50')
    expect(normalizeMoney(' 2000 ')).toBe('2000')
    expect(normalizeMoney('0.1')).toBe('0.10')
  })

  it('compares in cents without floats', () => {
    expect(toCents('0.10') + toCents('0.20')).toBe(toCents('0.30'))
    expect(toCents('1999.99') < toCents('2000')).toBe(true)
  })
})

describe('tripFormSchema', () => {
  it('accepts the defaults with a name', () => {
    expect(issues(filled)).toEqual({})
  })

  it('wants both dates or none', () => {
    expect(issues({ ...filled, startDate: '2026-10-09' })).toHaveProperty('endDate')
    expect(issues({ ...filled, endDate: '2026-10-09' })).toHaveProperty('startDate')
    expect(issues({ ...filled, startDate: '2026-10-09', endDate: '2026-10-09' })).toEqual({})
    expect(issues({ ...filled, startDate: '2026-10-09', endDate: '2026-10-08' })).toHaveProperty(
      'endDate',
    )
  })

  it('checks the day window and the budget range', () => {
    expect(issues({ ...filled, dayStart: '12:00', dayEnd: '12:00' })).toHaveProperty('dayEnd')
    expect(issues({ ...filled, budgetMin: '3000', budgetMax: '2000' })).toHaveProperty('budgetMax')
    expect(issues({ ...filled, budgetMin: '3000' })).toHaveProperty('budgetMax')
    expect(issues({ ...filled, budgetMin: 'abc', budgetMax: '2' })).toHaveProperty('budgetMin')
    expect(issues({ ...filled, budgetMin: '2000', budgetMax: '3000' })).toEqual({})
  })
})

describe('formValuesToPatch', () => {
  it('sends whole-trip budget as strings and clears the per-day pair', () => {
    const body = formValuesToPatch(
      { ...filled, budgetMin: '2000', budgetMax: '3000,5', flexPct: '10', citySlug: 'krakow' },
      'PLN',
    )
    expect(body).toMatchObject({
      budget_total_min: '2000',
      budget_total_max: '3000.50',
      budget_day_min: null,
      budget_day_max: null,
      budget_flex_pct: 10,
      city_slug: 'krakow',
      currency: 'PLN',
      day_start: '09:00:00',
      day_end: '21:00:00',
    })
  })

  it('moves the budget to the per-day pair when the scope is "day"', () => {
    const body = formValuesToPatch(
      { ...filled, budgetScope: 'day', budgetMin: '100', budgetMax: '200' },
      'PLN',
    )
    expect(body).toMatchObject({
      budget_day_min: '100',
      budget_day_max: '200',
      budget_total_min: null,
    })
  })

  it('clears empty optional fields with null', () => {
    expect(formValuesToPatch(filled, null)).toMatchObject({
      destination: null,
      city_slug: null,
      start_date: null,
      end_date: null,
      budget_total_min: null,
    })
  })
})

describe('tripToFormValues', () => {
  it('reads the API shape back, dropping seconds and ".00"', () => {
    const values = tripToFormValues(
      trip({
        budget_day_min: '100.00',
        budget_day_max: '250.50',
        start_date: '2026-10-09',
        end_date: '2026-10-09',
      }),
    )
    expect(values).toMatchObject({
      budgetScope: 'day',
      budgetMin: '100',
      budgetMax: '250.50',
      dayStart: '09:00',
      flexPct: '10',
    })
  })

  it('derives the kind from the dates', () => {
    expect(kindFromDates('2026-10-09', '2026-10-09')).toBe('outing')
    expect(kindFromDates('2026-10-09', '2026-10-12')).toBe('trip')
    expect(kindFromDates('2026-10-09', '')).toBeNull()
  })
})

describe('mapValidationErrors', () => {
  const item = (type: string, field: string, msg = 'English text, never read') => ({
    type,
    loc: ['body', field],
    msg,
  })

  it('reads the code in `type` and the field in `loc`, in the UI language', () => {
    const errors = mapValidationErrors([
      item('trip.dates_order', 'end_date'),
      item('trip.budget_order', 'budget_total_max'),
      item('trip.day_window_order', 'day_end'),
      item('trip.pair_required', 'budget_day_max'),
    ])
    expect(Object.keys(errors).sort()).toEqual(['budgetMax', 'dayEnd', 'endDate'])
    expect(errors.endDate).toBe('Koniec nie może być przed początkiem.')
    expect(errors.dayEnd).toBe('Koniec dnia musi być po jego początku.')
    expect(errors.budgetMax).toBe('Kwota „do” nie może być mniejsza niż „od”.')
  })

  it('maps a pair error to the missing end of the pair', () => {
    expect(mapValidationErrors([item('trip.pair_required', 'budget_total_min')]).budgetMin).toBe(
      'Podaj też kwotę „od”.',
    )
    expect(mapValidationErrors([item('trip.pair_required', 'start_date')]).startDate).toBe(
      'Podaj też początek. Jeden dzień to wyjście.',
    )
  })

  it('does not look at the message text', () => {
    const errors = mapValidationErrors([item('trip.dates_order', 'end_date', 'something else')])
    expect(errors.endDate).toBe('Koniec nie może być przed początkiem.')
    const other = mapValidationErrors([
      item('trip.unknown', 'end_date', 'end_date must not be before'),
    ])
    expect(other.endDate).toBe('Ta wartość nie została przyjęta.')
  })

  it('falls back by field for a framework error without a trip code', () => {
    const errors = mapValidationErrors([
      item('less_than_equal', 'budget_flex_pct'),
      item('decimal_max_digits', 'budget_total_min'),
    ])
    expect(errors.flexPct).toBe('Ta wartość nie została przyjęta.')
    expect(errors.budgetMin).toBe('Wpisz kwotę, np. 2000 albo 2000,50.')
  })

  it('ignores path errors and non-array details', () => {
    expect(mapValidationErrors([{ type: 'x', loc: ['path', 'trip_id'], msg: 'x' }])).toEqual({})
    expect(mapValidationErrors('nope')).toEqual({})
  })
})

describe('budgetSummary', () => {
  it('reads "from to, margin, scope" with formatted decimals', () => {
    const text = budgetSummary(
      trip({
        currency: 'PLN',
        budget_total_min: '2000.00',
        budget_total_max: '3000.00',
        budget_flex_pct: 10,
      }),
    )
    expect(text).toMatch(/^2\s000\szł do 3\s000\szł, margines 10%, na całość$/)
  })

  it('is null without a budget', () => {
    expect(budgetSummary(trip())).toBeNull()
  })
})

describe('diffPatch', () => {
  const base = { ...filled, budgetMin: '2000', budgetMax: '3000' }

  it('is empty when nothing changed', () => {
    expect(diffPatch(base, base, 'PLN', 'PLN')).toEqual({})
  })

  it('carries only the changed keys', () => {
    expect(diffPatch(base, { ...base, name: 'Inna' }, 'PLN', 'PLN')).toEqual({ name: 'Inna' })
  })

  it('sends the currency together with a budget change, never alone', () => {
    expect(diffPatch(base, { ...base, budgetMax: '3500' }, null, 'PLN')).toMatchObject({
      budget_total_max: '3500',
      currency: 'PLN',
    })
    expect(diffPatch({ ...filled }, { ...filled, name: 'Inna' }, null, 'PLN')).toEqual({
      name: 'Inna',
    })
  })
})

describe('money for display and currency', () => {
  it('reads Polish commas and rejects half-typed text', () => {
    expect(moneyToNumber('2000,5')).toBe(2000.5)
    expect(moneyToNumber('')).toBeNull()
    expect(moneyToNumber('20x')).toBeNull()
  })

  it('takes the currency from the city, then the trip, then PLN', () => {
    const cities = [{ slug: 'london', currency: 'GBP' }]
    expect(effectiveCurrency('london', cities, 'EUR')).toBe('GBP')
    expect(effectiveCurrency('', cities, 'EUR')).toBe('EUR')
    expect(effectiveCurrency('', cities, null)).toBe('PLN')
  })
})
