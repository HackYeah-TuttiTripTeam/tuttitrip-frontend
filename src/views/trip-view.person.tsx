import { ArrowLeft, CloudOff, SearchX, TriangleAlert } from '@keyline-icons/react'
import { PersonDetails } from '@/components/profiles/person-details'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePersonActions } from '@/hooks/use-person-actions'
import { useProfilePreferences } from '@/hooks/use-profile-preferences'
import { useSession } from '@/hooks/use-session'
import type { Person } from '@/lib/people'
import { m } from '@/paraglide/messages'

interface TripPersonViewProps {
  tripId: string
  /** Null when the id in the URL is not a person of this trip. */
  person: Person | undefined
  /** Host and co-host: may edit anyone. */
  canManage: boolean
  onBack: () => void
}

/**
 * The details of one person inside the Osoby tab. Named `trip-view.person` because a view may
 * only import views of its own name (rule 1).
 */
export function TripPersonView({ tripId, person, canManage, onBack }: TripPersonViewProps) {
  if (!person) {
    return (
      <StatusMessage
        icon={<SearchX />}
        title={m.prefs_person_missing_title()}
        action={
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            {m.prefs_back()}
          </Button>
        }
      >
        {m.people_empty_body_member()}
      </StatusMessage>
    )
  }
  return <LoadedPerson tripId={tripId} person={person} canManage={canManage} onBack={onBack} />
}

function LoadedPerson({
  tripId,
  person,
  canManage,
  onBack,
}: TripPersonViewProps & { person: Person }) {
  const session = useSession()
  const { preferences, isPending, problem, refetch } = useProfilePreferences(
    tripId,
    person.profile.id,
    session.status,
  )
  const actions = usePersonActions(tripId, person.profile)

  if (isPending) return <PersonDetailsSkeleton />

  if (problem || !preferences) {
    return (
      <StatusMessage
        role="alert"
        icon={problem === 'offline' ? <CloudOff /> : <TriangleAlert />}
        title={problem === 'offline' ? m.trips_offline_title() : m.prefs_load_failed_title()}
        action={
          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack}>
              {m.prefs_back()}
            </Button>
            <Button onClick={refetch}>{m.action_retry()}</Button>
          </div>
        }
      >
        {problem === 'offline' ? m.trips_offline_body() : m.trips_load_failed_body()}
      </StatusMessage>
    )
  }

  return (
    <PersonDetails
      person={person}
      preferences={preferences}
      canEdit={canManage || person.isMe}
      onBack={onBack}
      onSaveConstraints={actions.saveConstraints}
      onSetDiet={actions.setDiet}
      onSetInterests={actions.setInterests}
    />
  )
}

function PersonDetailsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <Skeleton className="h-11 w-48" />
      <Skeleton className="h-12 w-1/2" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
