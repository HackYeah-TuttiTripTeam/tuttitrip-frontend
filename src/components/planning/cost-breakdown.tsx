import { Receipt } from '@keyline-icons/react'
import type { PlanStop, PriceDiscount, TransitTicket } from '@/api/queries/plans'
import { PERCENT, UNVERIFIED_SURCHARGE_PCT } from '@/lib/constants'
import { formatDecimal } from '@/lib/format'
import { familySaving, sumDecimals } from '@/lib/plan-cost'
import { m } from '@/paraglide/messages'

const DISCOUNT_LABELS: Record<PriceDiscount, () => string> = {
  none: m.cost_discount_none,
  child: m.cost_discount_child,
  senior: m.cost_discount_senior,
  student: m.cost_discount_student,
  free: m.cost_discount_free,
  family: m.cost_discount_family,
}

const TICKET_LABELS: Record<TransitTicket['ticket'], () => string> = {
  single: m.cost_ticket_single,
  day: m.cost_ticket_day,
  h72: m.cost_ticket_72h,
  week: m.cost_ticket_week,
  family: m.cost_ticket_family,
}

/** The surcharge on an unverified price, in percent: what the API applied, else the default delta. */
function surchargePct(stop: PlanStop): number {
  const base = Number(stop.price_base)
  const inflated = Number(stop.price_inflated)
  return base > 0 && inflated > base
    ? Math.round((inflated / base - 1) * PERCENT)
    : UNVERIFIED_SURCHARGE_PCT
}

interface CostBreakdownProps {
  stop: PlanStop
  currency: string
  /** Names by profile id. */
  names: ReadonlyMap<string, string>
}

/**
 * What each person pays at a stop, with the discount. Opens under the stop; the verification chip
 * and the source of the price sit with the price above it. Without per-person lines (the API does
 * not send them yet) it shows the one price per person. The prices come from the API; this adds
 * them up and nothing else.
 */
export function CostBreakdown({ stop, currency, names }: CostBreakdownProps) {
  const lines = stop.price_lines ?? []
  const saving = familySaving(stop)
  const hasPrice = lines.length > 0 || stop.cost_per_person != null

  return (
    <details className="group text-sm leading-[22px]">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <Receipt aria-hidden="true" className="size-4" />
        {m.cost_open({ name: stop.name })}
      </summary>
      <div className="flex flex-col gap-2 pb-2">
        {lines.length > 0 ? (
          <ul className="flex flex-col divide-y">
            {lines.map((line) => (
              <li
                key={line.profile_id}
                className="flex items-baseline justify-between gap-3 py-1.5"
              >
                <span>
                  {names.get(line.profile_id) ?? ''}
                  <span className="text-muted-foreground">
                    {' '}
                    · {DISCOUNT_LABELS[line.discount]()}
                  </span>
                </span>
                <span className="font-heading font-semibold tabular-nums">
                  {formatDecimal(line.price, currency)}
                </span>
              </li>
            ))}
            <li className="flex items-baseline justify-between gap-3 py-1.5 font-medium">
              <span>{m.cost_sum()}</span>
              <span className="font-heading font-semibold tabular-nums">
                {formatDecimal(sumDecimals(lines.map((line) => line.price)), currency)}
              </span>
            </li>
          </ul>
        ) : (
          <p className="text-muted-foreground">
            {stop.cost_per_person != null
              ? m.cost_flat({ amount: formatDecimal(stop.cost_per_person, currency) })
              : m.plan_price_none()}
          </p>
        )}
        {saving && (
          <p className="font-medium text-want-ink">
            {m.cost_family_saving({ amount: formatDecimal(saving, currency) })}
          </p>
        )}
        {!stop.price_verified && hasPrice && (
          <p className="text-muted-foreground">
            {m.cost_surcharge_note({ pct: surchargePct(stop) })}
          </p>
        )}
      </div>
    </details>
  )
}

interface DayCostProps {
  /** Cost of the day for the whole group; null when no stop of the day has a price. */
  cost: string | null
  currency: string
  /** Tickets of public transport for this day; information, outside the budget. */
  tickets: TransitTicket[]
}

/** The day's total in the day header, and under it the transport tickets as information only. */
export function DayCost({ cost, currency, tickets }: DayCostProps) {
  return (
    <div className="flex flex-col gap-1 text-sm leading-[22px]">
      <p className="font-heading font-semibold tabular-nums">
        {cost == null ? m.cost_day_none() : m.cost_day({ amount: formatDecimal(cost, currency) })}
      </p>
      {tickets.map((ticket) => (
        <p key={ticket.ticket} className="text-muted-foreground">
          {m.cost_transit({
            ticket: TICKET_LABELS[ticket.ticket](),
            amount: formatDecimal(ticket.cost, currency),
          })}
        </p>
      ))}
    </div>
  )
}
