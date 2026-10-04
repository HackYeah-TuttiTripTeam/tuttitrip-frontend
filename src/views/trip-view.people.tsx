import { CloudOff, TriangleAlert } from '@keyline-icons/react'
import { FamilyBuilder, FamilyBuilderSkeleton } from '@/components/profiles/family-builder'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useProfileActions } from '@/hooks/use-profile-actions'
import { useProfiles } from '@/hooks/use-profiles'
import { useSession } from '@/hooks/use-session'
import { m } from '@/paraglide/messages'
import { TripCheckinsView } from './trip-view.checkins'
import { TripInvitationsView } from './trip-view.invitations'
import { TripPersonView } from './trip-view.person'
import { TripVotingView } from './trip-view.voting'

interface TripPeopleViewProps {
  tripId: string
  tripName: string
  canManage: boolean
  citySlug: string | null
  /** Host only: fills in check-ins of people without an account. */
  canFillIn: boolean
  /** The person whose details are open (the `person` search param), or undefined for the list. */
  personId: string | undefined
  onPersonChange: (id: string | undefined) => void
}

/**
 * The Osoby tab. Named `trip-view.people` because a view may only import views of its own
 * name (rule 1); TripView renders it and passes the trip id and the caller's rights.
 */
export function TripPeopleView({
  tripId,
  tripName,
  canManage,
  citySlug,
  canFillIn,
  personId,
  onPersonChange,
}: TripPeopleViewProps) {
  const session = useSession()
  const { people, rolesFailed, isPending, problem, refetch } = useProfiles(tripId, session.status)
  const actions = useProfileActions(tripId)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  const profileNames = new Map(people.map(({ profile }) => [profile.id, profile.display_name]))
  const hostTools = canManage ? (
    <>
      <TripVotingView tripId={tripId} tripName={tripName} people={people} />
      <TripInvitationsView tripId={tripId} tripName={tripName} profileNames={profileNames} />
    </>
  ) : null

  if (isPending) return <FamilyBuilderSkeleton />

  if (problem) {
    return (
      <StatusMessage
        role="alert"
        icon={problem === 'offline' ? <CloudOff /> : <TriangleAlert />}
        title={problem === 'offline' ? m.trips_offline_title() : m.people_load_failed_title()}
        action={
          <Button variant="outline" onClick={refetch}>
            {m.action_retry()}
          </Button>
        }
      >
        {problem === 'offline' ? m.trips_offline_body() : m.trips_load_failed_body()}
      </StatusMessage>
    )
  }

  if (personId) {
    return (
      <TripPersonView
        tripId={tripId}
        person={people.find((person) => person.profile.id === personId)}
        canManage={canManage}
        citySlug={citySlug}
        onBack={() => onPersonChange(undefined)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <FamilyBuilder
        people={people}
        rolesFailed={rolesFailed}
        canManage={canManage}
        isDesktop={isDesktop}
        onAdd={actions.add}
        onEdit={actions.edit}
        onRemove={actions.remove}
        onOpenPerson={(profile) => onPersonChange(profile.id)}
      />
      <TripCheckinsView tripId={tripId} people={people} canFillIn={canFillIn} />
      {hostTools}
    </div>
  )
}
