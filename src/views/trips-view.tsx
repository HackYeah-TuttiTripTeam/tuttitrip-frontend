import {
  CloudOff,
  KeyRound,
  PlaneTakeoff,
  Plus,
  SearchX,
  TriangleAlert,
} from '@keyline-icons/react'
import { getRouteApi } from '@tanstack/react-router'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { StatusMessage } from '@/components/shared/status-message'
import { TripForm } from '@/components/trips/trip-form'
import { TripsTable, TripsTableSkeleton } from '@/components/trips/trips-table'
import { TripsToolbar } from '@/components/trips/trips-toolbar'
import { Button } from '@/components/ui/button'
import { useCities } from '@/hooks/use-cities'
import { useDebouncedInput } from '@/hooks/use-debounced-input'
import { useHelpTopic } from '@/hooks/use-help-topic'
import { useClampPage, useListSearch } from '@/hooks/use-list-search'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useSaveTrip } from '@/hooks/use-save-trip'
import { useSession } from '@/hooks/use-session'
import { useTrips } from '@/hooks/use-trips'
import { isDev } from '@/lib/env'
import { TOUR } from '@/lib/help'
import { tripsTopic } from '@/lib/help-topics'
import { EMPTY_TRIP_FORM } from '@/lib/trip-form'
import { tripFilterDefaults } from '@/loaders/trips'
import { m } from '@/paraglide/messages'
import { useUiStore } from '@/stores/ui-store'

const route = getRouteApi('/trips')

export function TripsView() {
  const session = useSession()
  useHelpTopic(tripsTopic)
  const { search, setPage, setSize, setSort, setFilters, reset } = useListSearch(route, {
    filterDefaults: tripFilterDefaults,
  })
  const { trips, total, pages, isPending, isPlaceholder, problem, refetch } = useTrips(
    search,
    session.status,
  )
  useClampPage(search.page, pages, setPage)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const createTripOpen = useUiStore((state) => state.createTripOpen)
  const setCreateTripOpen = useUiStore((state) => state.setCreateTripOpen)
  const { cities } = useCities(session.status)
  const createTrip = useSaveTrip(null, cities)
  const queryInput = useDebouncedInput(search.q, (q) => setFilters({ q }))

  const hasFilters =
    search.q.trim() !== '' ||
    search.role.length > 0 ||
    [search.city, search.kind, search.when, search.status, search.start_from, search.start_to].some(
      Boolean,
    )

  const openCreate = () => {
    createTrip.reset()
    setCreateTripOpen(true)
  }

  const needsLogin = session.status === 'anonymous' || problem === 'unauthorized'
  // A page past the end is replaced by the last one (useClampPage): skeleton until that lands.
  const pastTheEnd = pages !== undefined && pages > 0 && search.page > pages
  const showList =
    !needsLogin && !problem && !isPending && !pastTheEnd && session.status !== 'loading'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1" data-tour={TOUR.tripsHeader}>
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">{m.trips_title()}</h1>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {showList && total > 0 ? m.trips_count({ count: total }) : m.trips_tagline()}
          </p>
        </div>
      </div>

      {showList && (total > 0 || hasFilters) && (
        <div data-tour={TOUR.tripsToolbar}>
          <TripsToolbar
            query={queryInput.draft}
            onQueryChange={queryInput.setDraft}
            onQueryClear={queryInput.clear}
            sort={search.sort}
            dir={search.dir}
            onSortChange={setSort}
            filters={search}
            onFiltersChange={setFilters}
            cities={cities}
            hasFilters={hasFilters}
            onReset={reset}
          />
        </div>
      )}

      {session.status === 'loading' || isPending || pastTheEnd ? (
        <TripsTableSkeleton />
      ) : session.error && session.status === 'anonymous' ? (
        <StatusMessage
          role="alert"
          icon={<TriangleAlert />}
          title={m.trips_login_failed_title()}
          action={<Button onClick={session.login}>{m.action_retry()}</Button>}
        >
          {session.error}
        </StatusMessage>
      ) : needsLogin ? (
        <StatusMessage
          icon={<KeyRound />}
          title={m.trips_login_required_title()}
          action={
            session.status === 'disabled' ? undefined : (
              <Button onClick={session.login}>{m.account_login()}</Button>
            )
          }
        >
          {session.status !== 'disabled'
            ? m.trips_login_required_body()
            : isDev
              ? m.trips_login_required_auth_disabled_dev()
              : m.trips_login_required_auth_disabled()}
        </StatusMessage>
      ) : problem === 'offline' ? (
        <StatusMessage
          role="alert"
          icon={<CloudOff />}
          title={m.trips_offline_title()}
          action={
            <Button variant="outline" onClick={refetch}>
              {m.action_retry()}
            </Button>
          }
        >
          {m.trips_offline_body()}
        </StatusMessage>
      ) : problem ? (
        <StatusMessage
          role="alert"
          icon={<TriangleAlert />}
          title={m.trips_load_failed_title()}
          action={
            <Button variant="outline" onClick={refetch}>
              {m.action_retry()}
            </Button>
          }
        >
          {m.trips_load_failed_body()}
        </StatusMessage>
      ) : total === 0 && !hasFilters ? (
        <StatusMessage
          icon={<PlaneTakeoff />}
          title={m.trips_empty_title()}
          action={
            <Button onClick={openCreate}>
              <Plus />
              {m.action_new_trip()}
            </Button>
          }
        >
          {m.trips_empty_body()}
        </StatusMessage>
      ) : total === 0 ? (
        <StatusMessage
          icon={<SearchX />}
          title={m.trips_no_match_title()}
          action={
            <Button variant="outline" onClick={reset}>
              {m.trips_filters_clear()}
            </Button>
          }
        >
          {m.trips_no_match_body()}
        </StatusMessage>
      ) : (
        <div
          aria-busy={isPlaceholder}
          className={isPlaceholder ? 'opacity-60 transition-opacity' : undefined}
          data-tour={TOUR.tripsList}
        >
          <TripsTable trips={trips} sort={search.sort} dir={search.dir} onSortChange={setSort} />
        </div>
      )}

      {showList && pages !== undefined && total > 0 && (
        <div data-tour={TOUR.tripsPagination}>
          <PaginationBar
            page={search.page}
            pages={pages}
            size={search.size}
            total={total}
            busy={isPlaceholder}
            onPageChange={(page) => setPage(page)}
            onSizeChange={setSize}
          />
        </div>
      )}

      <ResponsiveModal
        open={createTripOpen}
        onOpenChange={setCreateTripOpen}
        isDesktop={isDesktop}
        title={m.action_new_trip()}
        description={m.trips_create_description()}
      >
        <TripForm
          initial={EMPTY_TRIP_FORM}
          cities={cities}
          fieldErrors={createTrip.fieldErrors}
          submitError={createTrip.submitError}
          isSubmitting={createTrip.isPending}
          submitLabel={m.trip_form_submit()}
          submittingLabel={m.trip_form_submitting()}
          onSubmit={async (values) => {
            if (await createTrip.submit(values)) setCreateTripOpen(false)
          }}
        />
      </ResponsiveModal>
    </div>
  )
}
