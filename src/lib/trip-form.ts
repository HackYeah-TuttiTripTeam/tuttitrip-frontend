import { z } from 'zod'
import type { Schemas } from '@/api/client'
import { m } from '@/paraglide/messages'

type Trip = Schemas['TripRead']
type TripUpdate = Schemas['TripUpdate']

export type BudgetScope = 'total' | 'day'

/** Everything the trip form edits. All values are strings, exactly as typed or as the API sent them. */
export interface TripFormValues {
  name: string
  destination: string
  citySlug: string
  /** ISO date (YYYY-MM-DD) or "". */
  startDate: string
  endDate: string
  /** HH:MM */
  dayStart: string
  dayEnd: string
  budgetScope: BudgetScope
  /** Decimal string in whole currency units ("2000" or "2000.50") or "". Never parsed to a float. */
  budgetMin: string
  budgetMax: string
  /** Budget margin in percent, "0" to "50". */
  flexPct: string
}

export type TripFormField = keyof TripFormValues

export const DEFAULT_FLEX_PCT = '10'
export const FLEX_CHOICES = ['0', '10', '20']

export const EMPTY_TRIP_FORM: TripFormValues = {
  name: '',
  destination: '',
  citySlug: '',
  startDate: '',
  endDate: '',
  dayStart: '09:00',
  dayEnd: '21:00',
  budgetScope: 'total',
  budgetMin: '',
  budgetMax: '',
  flexPct: DEFAULT_FLEX_PCT,
}

const MONEY = /^\d{1,10}([.,]\d{1,2})?$/

/** "2000,5" -> "2000.50"; the string stays a string. */
export function normalizeMoney(raw: string): string {
  const text = raw.trim().replace(',', '.')
  if (!MONEY.test(raw.trim())) return text
  const [whole = '', frac = ''] = text.split('.')
  return frac ? `${whole}.${frac.padEnd(2, '0')}` : whole
}

/** Amount in hundredths as a bigint, so comparing two amounts never goes through a float. */
export function toCents(amount: string): bigint {
  const [whole = '0', frac = ''] = normalizeMoney(amount).split('.')
  return BigInt(whole) * 100n + BigInt(frac.padEnd(2, '0'))
}

/**
 * A typed amount as a number, for placing slider thumbs only (never for comparing or sending
 * money). null while the text is empty or not an amount yet.
 */
export function moneyToNumber(raw: string): number | null {
  if (!MONEY.test(raw.trim())) return null
  return Number.parseFloat(normalizeMoney(raw))
}

/** Currency of a trip: the chosen city's, else the trip's own, else PLN. One rule for field and save. */
export function effectiveCurrency(
  citySlug: string,
  cities: { slug: string; currency: string }[],
  tripCurrency: string | null | undefined,
): string {
  return cities.find((c) => c.slug === citySlug)?.currency ?? tripCurrency ?? 'PLN'
}

/** "2000.00" -> "2000", "575.50" stays. */
function stripZeros(amount: string): string {
  return amount.replace(/\.0+$/, '')
}

const hhmm = (time: string) => time.slice(0, 5)

/**
 * The form edits one budget pair. When a trip somehow holds both pairs, the whole-trip pair wins
 * and the per-day pair is dropped from the form (the next save clears it, as the scope sends null).
 */
export function tripToFormValues(trip: Trip): TripFormValues {
  const byDay = trip.budget_total_min == null && trip.budget_day_min != null
  const min = byDay ? trip.budget_day_min : trip.budget_total_min
  const max = byDay ? trip.budget_day_max : trip.budget_total_max
  return {
    name: trip.name,
    destination: trip.destination ?? '',
    citySlug: trip.city_slug ?? '',
    startDate: trip.start_date ?? '',
    endDate: trip.end_date ?? '',
    dayStart: hhmm(trip.day_start),
    dayEnd: hhmm(trip.day_end),
    budgetScope: byDay ? 'day' : 'total',
    budgetMin: min ? stripZeros(min) : '',
    budgetMax: max ? stripZeros(max) : '',
    flexPct: String(trip.budget_flex_pct),
  }
}

/** "wyjazd" or "wyjście", derived the way the API derives it, or null while the dates are open. */
export function kindFromDates(start: string, end: string): 'trip' | 'outing' | null {
  if (!start || !end) return null
  return start === end ? 'outing' : 'trip'
}

export const tripFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: () => m.trip_form_name_required() })
      .max(200, { error: () => m.trip_form_max_200() }),
    destination: z
      .string()
      .trim()
      .max(200, { error: () => m.trip_form_max_200() }),
    citySlug: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    dayStart: z.string().min(1, { error: () => m.trip_form_required() }),
    dayEnd: z.string().min(1, { error: () => m.trip_form_required() }),
    budgetScope: z.enum(['total', 'day']),
    budgetMin: z.string().trim(),
    budgetMax: z.string().trim(),
    flexPct: z.string(),
  })
  .superRefine((v, ctx) => {
    const add = (path: TripFormField, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message })
    if (v.startDate && !v.endDate) add('endDate', m.trip_form_end_required())
    if (!v.startDate && v.endDate) add('startDate', m.trip_form_start_required())
    if (v.startDate && v.endDate && v.endDate < v.startDate)
      add('endDate', m.trip_form_end_before_start())
    if (v.dayStart && v.dayEnd && v.dayEnd <= v.dayStart)
      add('dayEnd', m.trip_form_day_end_before_start())
    for (const field of ['budgetMin', 'budgetMax'] as const) {
      if (v[field] && !MONEY.test(v[field])) add(field, m.trip_form_money_invalid())
    }
    const lo = MONEY.test(v.budgetMin)
    const hi = MONEY.test(v.budgetMax)
    if (lo && !v.budgetMax) add('budgetMax', m.trip_form_budget_max_required())
    if (hi && !v.budgetMin) add('budgetMin', m.trip_form_budget_min_required())
    if (lo && hi && toCents(v.budgetMax) < toCents(v.budgetMin)) {
      add('budgetMax', m.trip_form_budget_max_below_min())
    }
  })

/**
 * The PATCH body for the whole form. The unused budget scope is sent as null, so switching
 * "per day" to "whole trip" clears the old pair.
 */
export function formValuesToPatch(v: TripFormValues, currency: string | null): TripUpdate {
  const min = v.budgetMin ? normalizeMoney(v.budgetMin) : null
  const max = v.budgetMax ? normalizeMoney(v.budgetMax) : null
  const total = v.budgetScope === 'total'
  return {
    name: v.name.trim(),
    destination: v.destination.trim() || null,
    city_slug: v.citySlug || null,
    currency,
    start_date: v.startDate || null,
    end_date: v.endDate || null,
    day_start: `${v.dayStart}:00`,
    day_end: `${v.dayEnd}:00`,
    budget_total_min: total ? min : null,
    budget_total_max: total ? max : null,
    budget_day_min: total ? null : min,
    budget_day_max: total ? null : max,
    budget_flex_pct: Number(v.flexPct),
  }
}

/** Money fields of the API body; their "not a valid amount" errors read as an amount problem. */
const MONEY_API_FIELDS = new Set([
  'budget_total_min',
  'budget_total_max',
  'budget_day_min',
  'budget_day_max',
])

const FIELD_OF_API: Record<string, TripFormField> = {
  name: 'name',
  destination: 'destination',
  city_slug: 'citySlug',
  currency: 'citySlug',
  start_date: 'startDate',
  end_date: 'endDate',
  day_start: 'dayStart',
  day_end: 'dayEnd',
  budget_total_min: 'budgetMin',
  budget_day_min: 'budgetMin',
  budget_total_max: 'budgetMax',
  budget_day_max: 'budgetMax',
  budget_flex_pct: 'flexPct',
}

/**
 * Maps the backend's 422 body onto form fields with Polish/English copy. An item is read by its
 * `type` (a stable `trip.<code>`, see TripErrorCode) and `loc[1]` (the field); `msg` is English
 * and never shown or parsed.
 */
export function mapValidationErrors(detail: unknown): Partial<Record<TripFormField, string>> {
  const out: Partial<Record<TripFormField, string>> = {}
  if (!Array.isArray(detail)) return out
  for (const item of detail) {
    if (typeof item !== 'object' || item === null || !('loc' in item) || !Array.isArray(item.loc))
      continue
    const [where, apiField] = item.loc
    if (where !== 'body' || typeof apiField !== 'string') continue
    const field = FIELD_OF_API[apiField]
    if (!field || out[field]) continue
    const type = 'type' in item && typeof item.type === 'string' ? item.type : ''
    out[field] = serverMessage(type, apiField)
  }
  return out
}

function serverMessage(type: string, apiField: string): string {
  switch (type) {
    case 'trip.dates_order':
      return m.trip_form_end_before_start()
    case 'trip.budget_order':
      return m.trip_form_budget_max_below_min()
    case 'trip.day_window_order':
      return m.trip_form_day_end_before_start()
    case 'trip.pair_required':
      if (MONEY_API_FIELDS.has(apiField)) {
        return apiField.endsWith('max')
          ? m.trip_form_budget_max_required()
          : m.trip_form_budget_min_required()
      }
      return apiField === 'end_date' ? m.trip_form_end_required() : m.trip_form_start_required()
    case 'trip.null_not_allowed':
      return m.trip_form_required()
    default:
      // A framework error (type, range, pattern) with no trip code.
      return MONEY_API_FIELDS.has(apiField)
        ? m.trip_form_money_invalid()
        : m.trip_form_field_invalid()
  }
}

const BUDGET_KEYS = [
  'city_slug',
  'budget_total_min',
  'budget_total_max',
  'budget_day_min',
  'budget_day_max',
] as const

/**
 * PATCH body with only what changed against the form's starting values. `currency` is sent only
 * together with a city or budget change. An empty result means there is nothing to save.
 */
export function diffPatch(
  initial: TripFormValues,
  values: TripFormValues,
  initialCurrency: string | null,
  currency: string,
): TripUpdate {
  const before = formValuesToPatch(initial, initialCurrency)
  const after = formValuesToPatch(values, currency)
  const diff: Record<string, unknown> = {}
  for (const key of Object.keys(after) as (keyof TripUpdate)[]) {
    if (after[key] !== before[key]) diff[key] = after[key]
  }
  if (!BUDGET_KEYS.some((key) => key in diff)) delete diff.currency
  return diff as TripUpdate
}
