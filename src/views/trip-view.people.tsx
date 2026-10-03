import { CloudOff, TriangleAlert } from '@keyline-icons/react'
import { FamilyBuilder, FamilyBuilderSkeleton } from '@/components/profiles/family-builder'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useProfileActions } from '@/hooks/use-profile-actions'
import { useProfiles } from '@/hooks/use-profiles'
import { useSession } from '@/hooks/use-session'
import { m } from '@/paraglide/messages'

interface TripPeopleViewProps {
  tripId: string
  canManage: boolean
}

/**
 * The Osoby tab. Named `trip-view.people` because a view may only import views of its own
 * name (rule 1); TripView renders it and passes the trip id and the caller's rights.
 */
export function TripPeopleView({ tripId, canManage }: TripPeopleViewProps) {
  const session = useSession()
  const { people, isPending, problem, refetch } = useProfiles(tripId, session.status)
  const actions = useProfileActions(tripId)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

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

  return (
    <FamilyBuilder
      people={people}
      canManage={canManage}
      isDesktop={isDesktop}
      onAdd={actions.add}
      onEdit={actions.edit}
      onRemove={actions.remove}
    />
  )
}
