import {
  CloudOff,
  KeyRound,
  PlaneTakeoff,
  Plus,
  SearchX,
  TriangleAlert,
} from '@keyline-icons/react'
import { getRouteApi } from '@tanstack/react-router'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { StatusMessage } from '@/components/shared/status-message'
import { CreateTripForm } from '@/components/trips/create-trip-form'
import { TripsTable, TripsTableSkeleton } from '@/components/trips/trips-table'
import { TripsToolbar } from '@/components/trips/trips-toolbar'
import { Button } from '@/components/ui/button'
import { useCreateTrip } from '@/hooks/use-create-trip'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useSession } from '@/hooks/use-session'
import { useTrips } from '@/hooks/use-trips'
import { isDev } from '@/lib/env'
import type { SortDirection, TripSortKey } from '@/loaders/trips'
import { m } from '@/paraglide/messages'
import { useUiStore } from '@/stores/ui-store'

const route = getRouteApi('/trips')

export function TripsView() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const session = useSession()
  const { trips, total, isPending, problem, refetch } = useTrips(search, session.status)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const createTripOpen = useUiStore((state) => state.createTripOpen)
  const setCreateTripOpen = useUiStore((state) => state.setCreateTripOpen)
  const createTrip = useCreateTrip()

  // replace: typing in the search box should not flood the back button.
  const setQuery = (q: string) =>
    void navigate({ search: (prev) => ({ ...prev, q }), replace: true })
  const setSort = (sort: TripSortKey, dir: SortDirection) =>
    void navigate({ search: (prev) => ({ ...prev, sort, dir }), replace: true })

  const openCreate = () => {
    createTrip.reset()
    setCreateTripOpen(true)
  }

  const needsLogin = session.status === 'anonymous' || problem === 'unauthorized'
  const showList = !needsLogin && !problem && !isPending && session.status !== 'loading'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">{m.trips_title()}</h1>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {showList && total > 0
              ? search.q
                ? m.trips_count_filtered({ count: trips.length, total })
                : m.trips_count({ count: total })
              : m.trips_tagline()}
          </p>
        </div>
      </div>

      {showList && total > 0 && (
        <TripsToolbar
          query={search.q}
          onQueryChange={setQuery}
          sort={search.sort}
          dir={search.dir}
          onSortChange={setSort}
        />
      )}

      {session.status === 'loading' || isPending ? (
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
      ) : total === 0 ? (
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
      ) : trips.length === 0 ? (
        <StatusMessage
          icon={<SearchX />}
          title={m.trips_no_match_title({ query: search.q })}
          action={
            <Button variant="outline" onClick={() => setQuery('')}>
              {m.trips_no_match_clear()}
            </Button>
          }
        >
          {m.trips_no_match_body()}
        </StatusMessage>
      ) : (
        <TripsTable trips={trips} sort={search.sort} dir={search.dir} onSortChange={setSort} />
      )}

      <ResponsiveModal
        open={createTripOpen}
        onOpenChange={setCreateTripOpen}
        isDesktop={isDesktop}
        title={m.action_new_trip()}
        description={m.trips_create_description()}
      >
        <CreateTripForm
          isSubmitting={createTrip.isPending}
          submitError={createTrip.isError ? m.trips_create_failed() : null}
          onSubmit={(values) =>
            createTrip.mutate(
              { body: { name: values.name, destination: values.destination || null } },
              { onSuccess: () => setCreateTripOpen(false) },
            )
          }
        />
      </ResponsiveModal>
    </div>
  )
}
