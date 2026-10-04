import type { PlanStop } from '@/api/queries/plans'
import { formatDecimal } from '@/lib/format'
import { m } from '@/paraglide/messages'

/**
 * The price of a stop as words, or null for "no data". No base price or no source is "no data",
 * a price never comes from anywhere but the data. An unverified price also names the amount the
 * budget counts (base inflated by delta, from the API).
 */
export function stopPriceText(stop: PlanStop, currency: string): string | null {
  const price = stop.price_source_url ? stop.price_base : null
  if (price == null) return null
  if (/^0(\.0+)?$/.test(price)) return m.plan_price_free()
  const amount = formatDecimal(price, currency)
  const budgeted =
    !stop.price_verified && stop.price_inflated != null && stop.price_inflated !== price
      ? formatDecimal(stop.price_inflated, currency)
      : null
  return budgeted
    ? m.plan_price_per_person_budgeted({ amount, budgeted })
    : m.plan_price_per_person({ amount })
}
