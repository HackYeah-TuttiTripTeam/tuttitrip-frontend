import { cn } from 'cn'
import type { ReactNode } from 'react'
import type { PlanStop } from '@/api/queries/plans'
import { formatClock, formatDecimal } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { TransferRow } from './transfer-row'
import { VerificationChip } from './verification-chip'

const KIND_LABELS: Record<PlanStop['kind'], () => string> = {
  attraction: m.plan_kind_attraction,
  food: m.plan_kind_food,
}

function minutesOfDay(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/** "2 h", "1 h 30 min", "45 min". */
function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const min = totalMinutes % 60
  if (h > 0 && min > 0) return m.plan_duration_h_min({ h, min })
  return h > 0 ? m.plan_duration_h({ h }) : m.plan_duration_min({ min })
}

interface PlanTimelineProps {
  stops: PlanStop[]
  currency: string
  /** Room for what later issues add to a stop: rating and veto, verdict, place card. */
  renderActions?: (stop: PlanStop) => ReactNode
}

/** One day as a route: time on the left, a dotted rail, the stops and the legs between them. */
export function PlanTimeline({ stops, currency, renderActions }: PlanTimelineProps) {
  return (
    <ol className="flex flex-col">
      {stops.map((stop) => (
        <PlanStopItem key={stop.place_id} stop={stop} currency={currency}>
          {renderActions?.(stop)}
        </PlanStopItem>
      ))}
    </ol>
  )
}

interface PlanStopItemProps {
  stop: PlanStop
  currency: string
  children?: ReactNode
}

function PlanStopItem({ stop, currency, children }: PlanStopItemProps) {
  const minutes = minutesOfDay(stop.end) - minutesOfDay(stop.start)
  return (
    <>
      {stop.transfer && (
        <li className="grid grid-cols-[3.25rem_1.125rem_1fr] gap-x-3">
          <span aria-hidden="true" />
          <Rail />
          <div className="pb-3">
            <TransferRow transfer={stop.transfer} currency={currency} />
          </div>
        </li>
      )}
      <li className="grid grid-cols-[3.25rem_1.125rem_1fr] gap-x-3 last:[&_.rail-line]:hidden">
        <time className="pt-0.5 font-heading font-semibold text-[15px] tabular-nums leading-6">
          {formatClock(stop.start)}
        </time>
        <Rail dot />
        <div className="flex flex-col gap-2 pb-5">
          <div className="flex flex-col">
            <h3 className="font-heading font-semibold text-lg leading-6">{stop.name}</h3>
            <p className="text-muted-foreground text-sm leading-[22px]">
              {KIND_LABELS[stop.kind]()}
              {minutes > 0 && ` · ${formatDuration(minutes)}`}
            </p>
          </div>
          <PriceLine stop={stop} currency={currency} />
          <VerificationChip
            kind="hours"
            verified={stop.hours_verified}
            verifiedAt={stop.hours_verified_at}
            sourceUrl={stop.hours_source_url}
          />
          {children}
        </div>
      </li>
    </>
  )
}

/** The dotted line of the route, with a stop dot on top of it when `dot` is set. */
function Rail({ dot = false }: { dot?: boolean }) {
  return (
    <span aria-hidden="true" className="relative flex justify-center">
      <span
        className={cn(
          'rail-line absolute -bottom-1 left-[7px] w-1 border-route border-l-4 border-dotted',
          dot ? 'top-[22px]' : 'top-0',
        )}
      />
      {dot && <span className="relative z-10 mt-1.5 size-2.5 rounded-full bg-foreground" />}
    </span>
  )
}

/**
 * The price per person. A price without a source is shown as it is plus the amount the budget
 * counts (base inflated by delta, from the API); no price at all is "no data", never a guess.
 */
function PriceLine({ stop, currency }: PlanStopItemProps) {
  const price = stop.price_base ?? stop.cost_per_person
  if (price == null) {
    return <p className="text-muted-foreground text-sm leading-[22px]">{m.plan_price_none()}</p>
  }
  const amount = formatDecimal(price, currency)
  const budgeted =
    !stop.price_verified && stop.price_inflated != null
      ? formatDecimal(stop.price_inflated, currency)
      : null
  const isFree = /^0(\.0+)?$/.test(price)

  return (
    <div className="flex flex-col gap-1">
      <p className="font-heading font-semibold tabular-nums leading-6">
        {isFree ? m.plan_price_free() : m.plan_price_per_person({ amount })}
        {budgeted && budgeted !== amount && (
          <span className="font-normal font-sans text-muted-foreground text-sm">
            {', '}
            {m.plan_price_budgeted({ amount: budgeted })}
          </span>
        )}
      </p>
      <VerificationChip
        kind="price"
        verified={stop.price_verified}
        verifiedAt={stop.price_verified_at}
        sourceUrl={stop.price_source_url}
      />
    </div>
  )
}
