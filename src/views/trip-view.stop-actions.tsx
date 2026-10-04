import type { PlanStop } from '@/api/queries/plans'
import type { Rating, Veto } from '@/api/queries/vetoes'
import { CostBreakdown } from '@/components/planning/cost-breakdown'
import { PlaceRating } from '@/components/profiles/place-rating'
import { VetoButton, VetoNote } from '@/components/profiles/veto-button'
import { useRatePlanPlace } from '@/hooks/use-rate-plan-place'
import { useVetoPlace } from '@/hooks/use-veto-place'

interface StopActionsProps {
  tripId: string
  stop: PlanStop
  currency: string
  /** Names by profile id (everyone on the plan). */
  names: ReadonlyMap<string, string>
  /** The signed-in person's profile; null when the account has none on this trip. */
  meProfileId: string | null
  /** Host and co-host file a veto for anyone; a member only for themselves. */
  canActForOthers: boolean
  ratings: Rating[]
  vetoes: Veto[]
  isDesktop: boolean
}

/** Under a stop of the plan: the cost per person, the thumbs, the veto and the vetoes it carries. */
export function StopActions({
  tripId,
  stop,
  currency,
  names,
  meProfileId,
  canActForOthers,
  ratings,
  vetoes,
  isDesktop,
}: StopActionsProps) {
  const rate = useRatePlanPlace(tripId, meProfileId ?? '')
  const veto = useVetoPlace(tripId)
  const mine = ratings.find(
    (rating) => rating.profile_id === meProfileId && rating.place_id === stop.place_id,
  )
  const people = [...names]
    .filter(([id]) => canActForOthers || id === meProfileId)
    .map(([id, name]) => ({ id, name }))
  const defaultPersonId = meProfileId ?? people[0]?.id

  return (
    <div className="flex flex-col gap-2">
      <CostBreakdown stop={stop} currency={currency} names={names} />
      <VetoNote
        vetoes={vetoes
          .filter((candidate) => candidate.place_id === stop.place_id)
          .map((candidate) => ({
            id: candidate.id,
            name: names.get(candidate.profile_id) ?? '',
            onBehalf: candidate.on_behalf,
          }))}
      />
      {meProfileId && (
        <PlaceRating
          placeName={stop.name}
          value={mine?.value ?? null}
          reason={mine?.reason_code ?? null}
          onRate={(value, reason) => rate.mutate({ placeId: stop.place_id, value, reason })}
        />
      )}
      {defaultPersonId && (
        <VetoButton
          placeName={stop.name}
          people={people}
          defaultPersonId={defaultPersonId}
          isDesktop={isDesktop}
          progress={veto.status}
          onVeto={(profileId) => veto.submit(profileId, stop.place_id)}
          onRetry={veto.retry}
        />
      )}
    </div>
  )
}
