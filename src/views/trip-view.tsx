import { CloudOff, KeyRound, SearchX, TriangleAlert } from '@keyline-icons/react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { StatusMessage } from '@/components/shared/status-message'
import { TripHeader, TripHeaderSkeleton } from '@/components/trips/trip-header'
import { TripTabs } from '@/components/trips/trip-tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/hooks/use-session'
import { useTrip } from '@/hooks/use-trip'
import { isDev } from '@/lib/env'
import type { TripTab } from '@/loaders/trip'
import { m } from '@/paraglide/messages'

const route = getRouteApi('/trips_/$tripId')

export function TripView() {
  const { tripId } = route.useParams()
  const { tab } = route.useSearch()
  const navigate = route.useNavigate()
  const session = useSession()
  const { trip, isPending, problem, refetch } = useTrip(tripId, session.status)

  // replace: switching tabs should not fill the back button.
  const setTab = (next: TripTab) =>
    void navigate({ search: (prev) => ({ ...prev, tab: next }), replace: true })

  const retry = (
    <Button variant="outline" onClick={refetch}>
      {m.action_retry()}
    </Button>
  )

  if (session.status === 'loading' || isPending) return <TripSkeleton />

  if (session.error && session.status === 'anonymous') {
    return (
      <StatusMessage
        role="alert"
        icon={<TriangleAlert />}
        title={m.trips_login_failed_title()}
        action={<Button onClick={session.login}>{m.action_retry()}</Button>}
      >
        {session.error}
      </StatusMessage>
    )
  }

  if (session.status === 'anonymous' || problem === 'unauthorized') {
    return (
      <StatusMessage
        icon={<KeyRound />}
        title={m.trip_login_required_title()}
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
    )
  }

  if (problem === 'not_found') {
    return (
      <StatusMessage
        icon={<SearchX />}
        title={m.trip_not_found_title()}
        action={
          <Button asChild variant="outline">
            <Link to="/trips">{m.trip_not_found_back()}</Link>
          </Button>
        }
      >
        {m.trip_not_found_body()}
      </StatusMessage>
    )
  }

  if (problem === 'offline') {
    return (
      <StatusMessage
        role="alert"
        icon={<CloudOff />}
        title={m.trips_offline_title()}
        action={retry}
      >
        {m.trips_offline_body()}
      </StatusMessage>
    )
  }

  if (problem || !trip) {
    return (
      <StatusMessage
        role="alert"
        icon={<TriangleAlert />}
        title={m.trip_load_failed_title()}
        action={retry}
      >
        {m.trips_load_failed_body()}
      </StatusMessage>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <TripHeader trip={trip} />
      <TripTabs tab={tab} onTabChange={setTab} role={trip.my_role} />
    </div>
  )
}

function TripSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <TripHeaderSkeleton />
      <Skeleton aria-hidden="true" className="h-13 w-full rounded-full md:max-w-md" />
    </div>
  )
}
