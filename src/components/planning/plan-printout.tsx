import type { Plan, PlanStop } from '@/api/queries/plans'
import type { Trip } from '@/api/queries/trips'
import { formatClock, formatDateRange, formatDuration } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { PlanSummary } from './plan-summary'
import { stopPriceText } from './stop-price'
import { transferText } from './transfer-row'
import { parseSource, verificationText } from './verification-chip'

const KIND_LABELS: Record<PlanStop['kind'], () => string> = {
  attraction: m.plan_kind_attraction,
  food: m.plan_kind_food,
}

function minutesOfDay(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/** "Source: example.com" for a source worth printing, nothing otherwise. */
function sourceText(url: string | null | undefined): string | null {
  const host = parseSource(url)?.hostname.replace(/^www\./, '')
  return host ? m.plan_source({ host }) : null
}

interface PlanPrintoutProps {
  plan: Plan
  trip: Pick<Trip, 'name' | 'destination' | 'start_date' | 'end_date'>
}

/**
 * The plan on paper: every day on its own page, plain text instead of chips, no map, no
 * navigation, black on white. Rendered only while printing (see `usePrinting`); the screen UI
 * around it is hidden with the `print:` variant.
 */
export function PlanPrintout({ plan, trip }: PlanPrintoutProps) {
  const { currency } = plan.budget
  const dates = formatDateRange(trip.start_date, trip.end_date)
  const facts = [trip.destination, dates].filter(Boolean).join(' · ')

  return (
    <article className="bg-background text-foreground">
      <header className="flex flex-col gap-3 border-b-2 border-foreground pb-4">
        {/* Always the light file: the printout is light whatever the theme on screen. */}
        <img
          src="/brand/tuttitrip-logo-horizontal-light.svg"
          alt=""
          className="h-9 w-auto self-start"
        />
        <h1 className="font-semibold text-3xl leading-9">{trip.name}</h1>
        {facts && <p className="text-base">{facts}</p>}
        <PlanSummary plan={plan} />
      </header>

      <div className="print:[&>section+section]:break-before-page">
        {plan.days.map((day) => (
          <section key={day.index} className="pt-6">
            <h2 className="mb-4 font-semibold text-2xl leading-8">
              {day.date
                ? m.plan_day_dated({ n: day.index, date: formatDateRange(day.date, null) ?? '' })
                : m.plan_day_n({ n: day.index })}
            </h2>
            {day.items.length === 0 ? (
              <p className="text-sm">{m.plan_day_empty()}</p>
            ) : (
              <ol className="flex flex-col">
                {day.items.map((stop) => (
                  <PrintStop key={stop.place_id} stop={stop} currency={currency} />
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>

      <footer className="mt-6 border-t pt-2 text-sm">
        {m.plan_print_footer({ n: plan.version })}
      </footer>
    </article>
  )
}

function PrintStop({ stop, currency }: { stop: PlanStop; currency: string }) {
  const minutes = minutesOfDay(stop.end) - minutesOfDay(stop.start)
  const kind = KIND_LABELS[stop.kind]()
  const price = stopPriceText(stop, currency)
  const priceSource = price ? sourceText(stop.price_source_url) : null
  const hoursSource = sourceText(stop.hours_source_url)
  const hours =
    stop.hours_verified || stop.hours_source_url
      ? verificationText('hours', stop.hours_verified, stop.hours_verified_at)
      : null

  return (
    <>
      {stop.transfer && (
        <li className="break-inside-avoid border-l-2 border-dotted border-foreground py-2 pl-4 text-sm [margin-left:5.25rem]">
          {transferText(stop.transfer, currency)}
        </li>
      )}
      <li className="grid break-inside-avoid grid-cols-[4.5rem_1fr] gap-x-3 border-t py-3">
        <time className="font-heading font-semibold text-base tabular-nums leading-6">
          {formatClock(stop.start)}
        </time>
        <div className="flex flex-col gap-0.5">
          <h3 className="font-semibold text-lg leading-6">{stop.name}</h3>
          <p className="text-sm leading-5">
            {minutes > 0 ? m.plan_kind_duration({ kind, duration: formatDuration(minutes) }) : kind}
          </p>
          <p className="text-sm leading-5">
            {price ?? m.plan_price_none()}
            {price &&
              ` · ${verificationText('price', stop.price_verified, stop.price_verified_at)}`}
            {priceSource && ` · ${priceSource}`}
          </p>
          <p className="text-sm leading-5">
            {hours ?? m.plan_hours_none()}
            {hoursSource && ` · ${hoursSource}`}
          </p>
        </div>
      </li>
    </>
  )
}
