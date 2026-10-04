import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'

type Locale = ReturnType<typeof getLocale>

/** BCP 47 tags behind the two UI languages. */
const INTL_TAG: Record<Locale, string> = { pl: 'pl-PL', en: 'en-US' }

/** One formatter per locale: Intl constructors are expensive, formats are not. */
function memoByLocale<T>(create: (tag: string, locale: Locale) => T): () => T {
  const cache = new Map<Locale, T>()
  return () => {
    const locale = getLocale()
    let value = cache.get(locale)
    if (!value) {
      value = create(INTL_TAG[locale], locale)
      cache.set(locale, value)
    }
    return value
  }
}

const dayFormat = memoByLocale(
  (tag) => new Intl.DateTimeFormat(tag, { weekday: 'short', day: 'numeric', month: 'short' }),
)
const dayWithYearFormat = memoByLocale(
  (tag) =>
    new Intl.DateTimeFormat(tag, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
)
const timeFormat = memoByLocale(
  (tag, locale) =>
    new Intl.DateTimeFormat(tag, {
      // Polish: "09:30" (24 h); English: "9:30 AM".
      hour: locale === 'pl' ? '2-digit' : 'numeric',
      minute: '2-digit',
      hourCycle: locale === 'pl' ? 'h23' : 'h12',
    }),
)
const collator = memoByLocale((tag) => new Intl.Collator(tag, { sensitivity: 'base' }))

/** "sob 4 paź" / "Sat, Oct 4"; the year is added only when it is not the current one. */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  const text = (sameYear ? dayFormat() : dayWithYearFormat()).format(date)
  // Intl gives "sob., 4 paź"; the design system writes "sob 4 paź".
  return getLocale() === 'pl' ? text.replace(/^(\p{L}+)\.?,\s*/u, '$1 ') : text
}

/** "09:30" / "9:30 AM". */
export function formatTime(iso: string | Date): string {
  return timeFormat().format(new Date(iso))
}

/** "1 240 zł" / "PLN 1,240": whole units, grouped even for four digits. */
export function formatMoney(amount: number, currency = 'PLN'): string {
  return new Intl.NumberFormat(INTL_TAG[getLocale()], {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    useGrouping: 'always',
  }).format(amount)
}

/** "0,87" / "0.87". */
export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(INTL_TAG[getLocale()], {
    maximumFractionDigits,
    useGrouping: 'always',
  }).format(value)
}

/** "58%" / "58%": a share between 0 and 1, whole percent. */
export function formatPercent(share: number): string {
  return new Intl.NumberFormat(INTL_TAG[getLocale()], {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(share)
}

/** Locale-aware, accent- and case-insensitive comparison for sorting names. */
export function compareText(a: string, b: string): number {
  return collator().compare(a, b)
}

/** Lower-casing by the rules of the current language. */
export function lowerCase(text: string): string {
  return text.toLocaleLowerCase(INTL_TAG[getLocale()])
}

/** "2026-10-04" -> local noon, so a date-only value never slips a day with the time zone. */
const dateOnly = (value: string) => `${value}T12:00:00`

/** "sob 4 paź" for one day, "sob 4 paź – wt 7 paź" for a range, null when there is no start. */
export function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start) return null
  const from = formatDate(dateOnly(start))
  if (!end || end === start) return from
  return `${from} – ${formatDate(dateOnly(end))}`
}

/**
 * "20 wrz" / "Sep 20" for a timestamp; the year only when it is not the current one. The UTC date
 * is used, so a check done at 00:30 does not show up as the day before in another time zone.
 */
export function formatDayMonth(iso: string): string {
  const date = new Date(iso)
  const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear()
  return new Intl.DateTimeFormat(INTL_TAG[getLocale()], {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** "2 h", "1 h 30 min", "45 min". */
export function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const min = totalMinutes % 60
  if (h > 0 && min > 0) return m.plan_duration_h_min({ h, min })
  return h > 0 ? m.plan_duration_h({ h }) : m.plan_duration_min({ min })
}

/** "10:00:00" (an API time of day without a date) -> "10:00" / "10:00 AM". */
export function formatClock(time: string): string {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return formatTime(new Date(2000, 0, 1, hours, minutes))
}

/**
 * The API sends money as decimal strings ("575.00"). Intl formats the string itself, so no float
 * ever sits between the backend's exact value and the screen. Whole amounts lose the ".00".
 */
export function formatDecimal(amount: string, currency = 'PLN'): string {
  const whole = /^-?\d+(\.0+)?$/.test(amount)
  return new Intl.NumberFormat(INTL_TAG[getLocale()], {
    style: 'currency',
    currency,
    maximumFractionDigits: whole ? 0 : 2,
    useGrouping: 'always',
  }).format(amount as `${number}`)
}

/** A plain decimal string ("6.67") in the locale's notation, no float in between: "6,67" / "6.67". */
export function formatDecimalNumber(value: string, maximumFractionDigits = 4): string {
  return new Intl.NumberFormat(INTL_TAG[getLocale()], { maximumFractionDigits }).format(
    value as `${number}`,
  )
}

/** Money with a currency, or a plain two-decimal number when the API has no currency to name. */
export function formatAmount(amount: string, currency: string | null): string {
  return currency ? formatDecimal(amount, currency) : formatDecimalNumber(amount, 2)
}

interface BudgetFields {
  currency: string | null
  budget_total_min: string | null
  budget_total_max: string | null
  budget_day_min: string | null
  budget_day_max: string | null
  budget_flex_pct: number
}

/** "2 000 zł do 3 000 zł, margines 10%, na całość", or null when no budget is set. */
export function budgetSummary(trip: BudgetFields): string | null {
  const byDay = trip.budget_total_min == null
  const min = byDay ? trip.budget_day_min : trip.budget_total_min
  const max = byDay ? trip.budget_day_max : trip.budget_total_max
  if (min == null || max == null) return null
  const currency = trip.currency ?? 'PLN'
  return m.trip_budget_summary({
    min: formatDecimal(min, currency),
    max: formatDecimal(max, currency),
    flex: trip.budget_flex_pct,
    scope: byDay ? m.trip_budget_scope_day_short() : m.trip_budget_scope_total_short(),
  })
}
