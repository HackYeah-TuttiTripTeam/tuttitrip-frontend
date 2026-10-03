import { CloudOff, KeyRound, SearchX, TriangleAlert } from '@keyline-icons/react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { StatusMessage } from '@/components/shared/status-message'
import { JoinForm } from '@/components/trips/join-form'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useJoinInvitation } from '@/hooks/use-join-invitation'
import { useJoinToken } from '@/hooks/use-join-token'
import { useSession } from '@/hooks/use-session'
import { isDev } from '@/lib/env'
import { stashJoinToken } from '@/lib/invite-link'
import { m } from '@/paraglide/messages'

const backToTrips = (
  <Button asChild variant="outline">
    <Link to="/trips">{m.trip_not_found_back()}</Link>
  </Button>
)

/** /join#t=<token>: sign in if needed, see the trip, confirm, land on its People tab. */
export function JoinView() {
  const session = useSession()
  const token = useJoinToken()
  const navigate = useNavigate()
  const signedIn = session.status === 'authenticated'
  const join = useJoinInvitation(token, signedIn)

  const joinedTripId = join.joined?.trip_id
  useEffect(() => {
    if (joinedTripId) {
      void navigate({
        to: '/trips/$tripId',
        params: { tripId: joinedTripId },
        search: { tab: 'people' },
        replace: true,
      })
    }
  }, [joinedTripId, navigate])

  if (token === null) {
    return (
      <StatusMessage icon={<SearchX />} title={m.join_missing_title()} action={backToTrips}>
        {m.join_missing_body()}
      </StatusMessage>
    )
  }

  if (session.status === 'loading') return <JoinSkeleton />

  if (session.status === 'disabled') {
    return (
      <StatusMessage role="alert" icon={<KeyRound />} title={m.join_login_title()}>
        {isDev
          ? m.trips_login_required_auth_disabled_dev()
          : m.trips_login_required_auth_disabled()}
      </StatusMessage>
    )
  }

  if (session.status === 'anonymous') {
    return (
      <StatusMessage
        role={session.error ? 'alert' : 'status'}
        icon={<KeyRound />}
        title={m.join_login_title()}
        action={
          <Button
            onClick={() => {
              // The Auth0 redirect reloads the page; this keeps the token until we are back.
              stashJoinToken(token)
              session.login()
            }}
          >
            {m.account_login()}
          </Button>
        }
      >
        {session.error ?? m.join_login_body()}
      </StatusMessage>
    )
  }

  if (join.isPending || join.joined) return <JoinSkeleton />

  if (join.problem === 'not_found' || join.joinProblem === 'not_found') {
    return (
      <StatusMessage icon={<SearchX />} title={m.join_dead_title()} action={backToTrips}>
        {m.join_dead_body()}
      </StatusMessage>
    )
  }

  if (join.problem === 'offline') {
    return (
      <StatusMessage
        role="alert"
        icon={<CloudOff />}
        title={m.trips_offline_title()}
        action={
          <Button variant="outline" onClick={join.refetch}>
            {m.action_retry()}
          </Button>
        }
      >
        {m.trips_offline_body()}
      </StatusMessage>
    )
  }

  if (join.problem || !join.trip) {
    return (
      <StatusMessage
        role="alert"
        icon={<TriangleAlert />}
        title={m.join_load_failed_title()}
        action={
          <Button variant="outline" onClick={join.refetch}>
            {m.action_retry()}
          </Button>
        }
      >
        {m.join_load_failed_body()}
      </StatusMessage>
    )
  }

  return (
    <JoinForm
      tripName={join.trip.trip_name}
      destination={join.trip.destination}
      alreadyMember={join.trip.already_member}
      defaultName={session.userName ?? ''}
      isSubmitting={join.isJoining}
      submitError={join.joinProblem ? m.join_failed() : null}
      onSubmit={join.accept}
    />
  )
}

function JoinSkeleton() {
  return (
    <div aria-hidden="true" className="flex max-w-md flex-col gap-4">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-11 w-full" />
    </div>
  )
}
