import type { ReactNode } from 'react'
import type { PlanStop } from '@/api/queries/plans'
import { formatClock, formatDuration } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { stopPriceText } from './stop-price'
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
  /** The stop picked on the map: highlighted, and the list scrolls to it (`stopDomId`). */
  selectedPlaceId?: string | null
}

/** The DOM id of a stop's list item, for scrolling to the stop picked on the map. */
export const stopDomId = (placeId: string) => `plan-stop-${placeId}`

/** One day as a route: time on the left, a dotted rail, the stops and the legs between them. */
export function PlanTimeline({
  stops,
  currency,
  renderActions,
  selectedPlaceId = null,
}: PlanTimelineProps) {
  return (
    <ol className="flex flex-col">
      {stops.map((stop, index) => (
        <PlanStopItem
          key={stop.place_id}
          stop={stop}
          number={index + 1}
          selected={stop.place_id === selectedPlaceId}
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
  /** Position in the day, the same number as the marker on the map. */
  number?: number
  selected?: boolean
  currency: string
  isLast?: boolean
  children?: ReactNode
}

function PlanStopItem({
  stop,
  number,
  selected = false,
  currency,
  isLast = false,
  children,
}: PlanStopItemProps) {
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
      <li
        id={stopDomId(stop.place_id)}
        aria-current={selected || undefined}
        className="grid scroll-mt-24 grid-cols-[3.25rem_1.125rem_1fr] gap-x-3"
      >
        <time className="pt-0.5 font-heading font-semibold text-[15px] tabular-nums leading-6">
          {formatClock(stop.start)}
        </time>
        <Rail stop={isLast ? 'goal' : 'dot'} />
        <div
          className={`flex flex-col gap-2 pb-5 transition-colors ${selected ? '-mt-1 -ml-2 rounded-lg bg-accent pt-1 pl-2' : ''}`}
        >
          <div className="flex flex-col">
            <h3 className="flex items-center gap-2 font-heading font-semibold text-lg leading-6">
              {number !== undefined && (
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground text-xs tabular-nums"
                >
                  {number}
                </span>
              )}
              {stop.name}
            </h3>
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
  const text = stopPriceText(stop, currency)
  if (text == null) {
    return <p className="text-muted-foreground text-sm leading-[22px]">{m.plan_price_none()}</p>
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="font-heading font-semibold tabular-nums leading-6">{text}</p>
      <VerificationChip
        kind="price"
        verified={stop.price_verified}
        verifiedAt={stop.price_verified_at}
        sourceUrl={stop.price_source_url}
      />
    </div>
  )
}
