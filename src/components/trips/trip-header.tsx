import { Calendar, ChevronLeft, MapPin, Wallet } from '@keyline-icons/react'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { Trip } from '@/api/queries/trips'
import { Skeleton } from '@/components/ui/skeleton'
import { budgetSummary, formatDateRange } from '@/lib/format'
import { m } from '@/paraglide/messages'

const ROLE_LABELS: Record<Trip['my_role'], () => string> = {
  host: m.trip_role_host,
  co_host: m.trip_role_co_host,
  member: m.trip_role_member,
}

const backLinkClass =
  '-ml-2 inline-flex h-11 items-center gap-1 self-start rounded-md px-2 text-muted-foreground text-sm outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50'

/** Name, city, dates and the caller's role; the way back to the list sits above. */
export function TripHeader({ trip, actions }: { trip: Trip; actions?: ReactNode }) {
  const dates = formatDateRange(trip.start_date, trip.end_date)
  const budget = budgetSummary(trip)
  return (
    <header className="flex flex-col gap-2">
      <Link to="/trips" className={backLinkClass}>
        <ChevronLeft aria-hidden="true" className="size-4" />
        {m.trip_back()}
      </Link>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-balance font-semibold text-3xl tracking-tight md:text-4xl">
          {trip.name}
        </h1>
        {actions}
      </div>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-sm">
        <li className="flex items-center gap-1.5">
          <MapPin aria-hidden="true" className="size-4" />
          {trip.destination ?? m.trip_destination_undecided_long()}
        </li>
        <li className="flex items-center gap-1.5">
          <Calendar aria-hidden="true" className="size-4" />
          {dates ?? m.trip_dates_undecided()}
        </li>
        <li className="flex items-center gap-1.5">
          <Wallet aria-hidden="true" className="size-4" />
          {budget ?? m.glossary_budget_unset()}
        </li>
        <li className="flex items-center gap-2">
          <span className="rounded-full border px-2.5 py-0.5 font-medium text-foreground text-xs">
            {ROLE_LABELS[trip.my_role]()}
          </span>
          {trip.kind === 'outing' && <span>{m.trip_kind_outing()}</span>}
        </li>
      </ul>
    </header>
  )
}

export function TripHeaderSkeleton() {
  return (
    // Same heights as TripHeader (back link 44, title 36/40, meta 22) so nothing jumps on load.
    <div aria-hidden="true" className="flex flex-col gap-2">
      <div className="h-11" />
      <Skeleton className="h-9 w-2/3 md:h-10" />
      <Skeleton className="h-[22px] w-1/2" />
    </div>
  )
}
