import { Bed, CloudOff, Search, TriangleAlert } from '@keyline-icons/react'
import { getRouteApi } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { ApiError } from '@/api/errors'
import type { Trip } from '@/api/queries/trips'
import { OfferPaste, type OfferPasteHandle } from '@/components/accommodation/offer-paste'
import { OfferResult } from '@/components/accommodation/offer-result'
import { RequirementToggles } from '@/components/accommodation/requirement-toggles'
import { SearchApproval } from '@/components/accommodation/search-approval'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccommodationRequirements } from '@/hooks/use-accommodation-requirements'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useOfferCheck } from '@/hooks/use-offer-check'
import { useSearchLinks } from '@/hooks/use-search-links'
import { tripNights } from '@/lib/accommodation'
import { m } from '@/paraglide/messages'

const route = getRouteApi('/trips_/$tripId')

interface TripAccommodationViewProps {
  trip: Trip
}

/** The Noclegi tab: requirements as switches, a pasted offer checked against them, the search. */
export function TripAccommodationView({ trip }: TripAccommodationViewProps) {
  const nights = tripNights(trip.start_date, trip.end_date)
  const isOuting = trip.kind === 'outing'

  if (isOuting) {
    return (
      <StatusMessage icon={<Bed />} title={m.accommodation_outing_title()}>
        {m.accommodation_outing_body()}
      </StatusMessage>
    )
  }
  if (nights.length === 0) {
    return (
      <StatusMessage icon={<Bed />} title={m.accommodation_no_dates_title()}>
        {m.accommodation_no_dates_body()}
      </StatusMessage>
    )
  }
  return <Accommodation trip={trip} nights={nights} />
}

function Accommodation({ trip, nights }: { trip: Trip; nights: string[] }) {
  const { offer: offerId } = route.useSearch()
  const navigate = route.useNavigate()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const canManage = trip.my_role !== 'member'

  const requirements = useAccommodationRequirements(trip.id, true)
  const check = useOfferCheck(
    trip.id,
    offerId,
    (id) => void navigate({ search: (prev) => ({ ...prev, offer: id }), replace: true }),
  )

  const [searching, setSearching] = useState(false)
  const [returned, setReturned] = useState(false)
  const search = useSearchLinks(trip.id, searching)
  const paste = useRef<OfferPasteHandle>(null)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium text-base">{m.accommodation_title()}</h2>
        {canManage && (
          <Button className="h-11 rounded-full px-5" onClick={() => setSearching(true)}>
            <Search aria-hidden="true" />
            {m.accommodation_search()}
          </Button>
        )}
      </div>

      {returned && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-lg bg-muted p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="leading-relaxed">{m.accommodation_returned()}</p>
          <Button
            variant="outline"
            className="h-11 rounded-full px-5"
            onClick={() => {
              setReturned(false)
              paste.current?.focus()
            }}
          >
            {m.accommodation_returned_action()}
          </Button>
        </div>
      )}

      <section aria-labelledby="requirements-title" className="flex flex-col gap-3">
        <div>
          <h3 id="requirements-title" className="font-medium text-base">
            {m.requirements_title()}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {canManage ? m.requirements_body() : m.requirements_body_readonly()}
          </p>
        </div>
        {requirements.isPending ? (
          <div aria-hidden="true" className="flex flex-col gap-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : requirements.problem ? (
          <StatusMessage
            role="alert"
            icon={requirements.problem === 'offline' ? <CloudOff /> : <TriangleAlert />}
            title={m.requirements_failed_title()}
            action={
              <Button variant="outline" onClick={requirements.refetch}>
                {m.action_retry()}
              </Button>
            }
          >
            {m.requirements_failed_body()}
          </StatusMessage>
        ) : (
          <>
            <RequirementToggles
              requirements={requirements.requirements}
              canManage={canManage}
              onChange={requirements.change}
            />
            {requirements.saveFailed && (
              <p role="alert" className="text-destructive text-sm">
                {m.requirements_save_failed()}
              </p>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="offer-title" className="flex flex-col gap-3 border-t pt-4">
        <div>
          <h3 id="offer-title" className="font-medium text-base">
            {m.offer_title()}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {canManage ? m.offer_body() : m.offer_body_readonly()}
          </p>
        </div>
        {canManage && (
          <OfferPaste
            handle={paste}
            nights={nights}
            isSubmitting={check.isSubmitting}
            error={check.submitError ? submitError(check.submitError) : null}
            onSubmit={check.submit}
          />
        )}
      </section>

      {check.problem && (
        <StatusMessage role="alert" icon={<TriangleAlert />} title={m.offer_load_failed_title()}>
          {m.offer_load_failed_body()}
        </StatusMessage>
      )}
      {check.offer && (
        <OfferResult
          offer={check.offer}
          onRecheck={check.recheck}
          rechecking={check.isSubmitting}
          canRecheck={canManage}
        />
      )}

      <SearchApproval
        open={searching}
        isDesktop={isDesktop}
        links={search.links}
        isPending={search.isPending}
        error={search.error ? linksError(search.error) : null}
        onCancel={() => setSearching(false)}
        onOpen={(link) => {
          search.open(link)
          setSearching(false)
          setReturned(true)
        }}
      />
    </div>
  )
}

function submitError(error: unknown): string {
  if (error instanceof ApiError && error.status === 503) return m.offer_worker_unavailable()
  if (error instanceof ApiError && error.status === 422) return m.offer_invalid()
  if (error instanceof ApiError && error.status === 403) return m.offer_forbidden()
  return m.offer_submit_failed()
}

function linksError(error: unknown): string {
  return error instanceof ApiError && error.status === 422 ? m.search_no_dates() : m.search_failed()
}
