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

/** Locale-aware, accent- and case-insensitive comparison for sorting names. */
export function compareText(a: string, b: string): number {
  return collator().compare(a, b)
}

/** Lower-casing by the rules of the current language. */
export function lowerCase(text: string): string {
  return text.toLocaleLowerCase(INTL_TAG[getLocale()])
}
