import { CloudOff, KeyRound, SearchX, TriangleAlert } from '@keyline-icons/react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { StatusMessage } from '@/components/shared/status-message'
import { TripHeader, TripHeaderSkeleton } from '@/components/trips/trip-header'
import { TripTabs } from '@/components/trips/trip-tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useHelpTopic } from '@/hooks/use-help-topic'
import { useLocationBeacon } from '@/hooks/use-locations'
import { useSession } from '@/hooks/use-session'
import { useTrip } from '@/hooks/use-trip'
import { isDev } from '@/lib/env'
import { TOUR } from '@/lib/help'
import { tripTopics } from '@/lib/help-topics'
import { tripHasEnded } from '@/lib/trip-dates'
import type { TripTab } from '@/lib/trip-tabs'
import { expenseSearchReset } from '@/loaders/expenses'
import { decisionLogReset } from '@/loaders/trip'
import { m } from '@/paraglide/messages'
import { TripAccommodationView } from './trip-view.accommodation'
import { TripExpensesView } from './trip-view.expenses'
import { TripLocationsView } from './trip-view.locations'
import { TripMembersView } from './trip-view.members'
import { TripPeopleView } from './trip-view.people'
import { TripPhotosView } from './trip-view.photos'
import { TripPlanView } from './trip-view.plan'
import { TripSettings } from './trip-view.settings'

const route = getRouteApi('/trips_/$tripId')

// The interview brings the AG-UI client (about 280 KB), so it loads as a chunk of its own.
const TripInterviewView = lazy(() =>
  import('./trip-view.interview').then((module) => ({ default: module.TripInterviewView })),
)

export function TripView() {
  const { tripId } = route.useParams()
  const { tab, person, voice } = route.useSearch()
  const navigate = route.useNavigate()
  const session = useSession()
  const { trip, isPending, problem, refetch } = useTrip(tripId, session.status)
  // Only a loaded trip has the elements the steps point at.
  useHelpTopic(trip && !problem ? tripTopics[tab] : null)
  // Serves a location-sharing consent the person gave, as long as this trip is open.
  useLocationBeacon(trip?.id, tripHasEnded(trip?.end_date))

  // replace: switching tabs should not fill the back button.
  const setTab = (next: TripTab) =>
    void navigate({
      search: (prev) => ({
        ...prev,
        ...expenseSearchReset,
        ...decisionLogReset,
        tab: next,
        person: undefined,
      }),
      replace: true,
    })

  // Opening a person is a step forward (the back button closes it); the tab switch above is not.
  const setPerson = (id: string | undefined) =>
    void navigate({ search: (prev) => ({ ...prev, person: id }) })

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
      <div className="print:hidden" data-tour={TOUR.tripHeader}>
        <TripHeader trip={trip} actions={<TripSettings trip={trip} />} />
      </div>
      {trip.my_status === 'pending' && tab !== 'members' && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm">{m.membership_pending_notice()}</p>
          <Button variant="outline" onClick={() => setTab('members')} className="h-11 sm:h-9">
            {m.membership_pending_open()}
          </Button>
        </div>
      )}
      <TripTabs
        tab={tab}
        onTabChange={setTab}
        interview={
          <Suspense fallback={<Skeleton aria-hidden="true" className="h-40 w-full" />}>
            <TripInterviewView
              key={trip.id}
              tripId={trip.id}
              canManage={trip.my_role !== 'member'}
              startVoice={voice !== undefined}
              onVoiceHandled={() =>
                void navigate({ search: (prev) => ({ ...prev, voice: undefined }), replace: true })
              }
              onOpenPerson={(id) =>
                void navigate({ search: (prev) => ({ ...prev, tab: 'people', person: id }) })
              }
            />
          </Suspense>
        }
        people={
          <TripPeopleView
            key={trip.id}
            tripId={trip.id}
            tripName={trip.name}
            canManage={trip.my_role !== 'member'}
            citySlug={trip.city_slug}
            canFillIn={trip.my_role === 'host'}
            personId={person}
            onPersonChange={setPerson}
          />
        }
        members={
          <TripMembersView
            key={trip.id}
            tripId={trip.id}
            tripName={trip.name}
            myRole={trip.my_role}
            myStatus={trip.my_status}
          />
        }
        plan={<TripPlanView key={trip.id} trip={trip} />}
        photos={<TripPhotosView key={trip.id} tripId={trip.id} isHost={trip.my_role === 'host'} />}
        locations={<TripLocationsView key={trip.id} tripId={trip.id} />}
        expenses={<TripExpensesView key={trip.id} trip={trip} />}
        accommodation={<TripAccommodationView key={trip.id} trip={trip} />}
      />
    </div>
  )
}

function TripSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <TripHeaderSkeleton />
      <Skeleton aria-hidden="true" className="h-[54px] w-full rounded-full md:max-w-xl" />
    </div>
  )
}
