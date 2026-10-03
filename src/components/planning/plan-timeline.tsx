import type { ReactNode } from 'react'
import type { PlanStop } from '@/api/queries/plans'
import { formatClock, formatDecimal, formatDuration } from '@/lib/format'
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
      {stops.map((stop, index) => (
        <PlanStopItem
          key={stop.place_id}
          stop={stop}
          currency={currency}
          isLast={index === stops.length - 1}
        >
          {renderActions?.(stop)}
        </PlanStopItem>
      ))}
    </ol>
  )
}

interface PlanStopItemProps {
  stop: PlanStop
  currency: string
  isLast?: boolean
  children?: ReactNode
}

function PlanStopItem({ stop, currency, isLast = false, children }: PlanStopItemProps) {
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
      <li className="grid grid-cols-[3.25rem_1.125rem_1fr] gap-x-3">
        <time className="pt-0.5 font-heading font-semibold text-[15px] tabular-nums leading-6">
          {formatClock(stop.start)}
        </time>
        <Rail stop={isLast ? 'goal' : 'dot'} />
        <div className="flex flex-col gap-2 pb-5">
          <div className="flex flex-col">
            <h3 className="font-heading font-semibold text-lg leading-6">{stop.name}</h3>
            <p className="text-muted-foreground text-sm leading-[22px]">
              {minutes > 0
                ? m.plan_kind_duration({
                    kind: KIND_LABELS[stop.kind](),
                    duration: formatDuration(minutes),
                  })
                : KIND_LABELS[stop.kind]()}
            </p>
          </div>
          <PriceLine stop={stop} currency={currency} />
          {stop.hours_verified || stop.hours_source_url ? (
            <VerificationChip
              kind="hours"
              verified={stop.hours_verified}
              verifiedAt={stop.hours_verified_at}
              sourceUrl={stop.hours_source_url}
            />
          ) : (
            <p className="text-muted-foreground text-sm leading-[22px]">{m.plan_hours_none()}</p>
          )}
          {children}
        </div>
      </li>
    </>
  )
}

/**
 * The route: a dotted line (`route-y`) with a dot per stop and a primary ring for the last stop of
 * the day. The line runs from the dot to the bottom, so no line sticks out above the first stop or
 * below the goal; the leg between stops (no `stop`) is line only.
 */
function Rail({ stop }: { stop?: 'dot' | 'goal' }) {
  return (
    <span aria-hidden="true" className="relative flex justify-center">
      {stop !== 'goal' && (
        <span
          className={`route-y absolute bottom-0 left-1/2 w-1 -translate-x-1/2 ${stop ? 'top-4' : 'top-0'}`}
        />
      )}
      {stop === 'dot' && (
        <span className="relative z-10 mt-1.5 size-2.5 rounded-full bg-foreground" />
      )}
      {stop === 'goal' && (
        <span className="mt-[3px] size-[18px] rounded-full border-[3.5px] border-primary bg-card" />
      )}
    </span>
  )
}

/**
 * The price per person. A price without a source is shown as it is plus the amount the budget
 * counts (base inflated by delta, from the API); no price at all is "no data", never a guess.
 */
function PriceLine({ stop, currency }: PlanStopItemProps) {
  // No base price or no source: "no data". A price never comes from anywhere but the data.
  const price = stop.price_source_url ? stop.price_base : null
  if (price == null) {
    return <p className="text-muted-foreground text-sm leading-[22px]">{m.plan_price_none()}</p>
  }
  const amount = formatDecimal(price, currency)
  const budgeted =
    !stop.price_verified && stop.price_inflated != null && stop.price_inflated !== price
      ? formatDecimal(stop.price_inflated, currency)
      : null
  const isFree = /^0(\.0+)?$/.test(price)

  return (
    <div className="flex flex-col gap-1">
      <p className="font-heading font-semibold tabular-nums leading-6">
        {isFree
          ? m.plan_price_free()
          : budgeted
            ? m.plan_price_per_person_budgeted({ amount, budgeted })
            : m.plan_price_per_person({ amount })}
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
