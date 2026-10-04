import type { ReactNode } from 'react'
import type { RatingValue, ReasonCode, VoteSession } from '@/api/queries/vote'
import { Skeleton } from '@/components/ui/skeleton'
import { m } from '@/paraglide/messages'
import { VotePlaceItem } from './vote-place'

interface VotePageProps {
  session: VoteSession
  busyPlaceId: string | undefined
  /** The last write went through: says thank you. */
  saved: boolean
  /** The last write failed: says so and that nothing was lost. */
  failed: boolean
  onRate: (placeId: string, value: RatingValue, reason?: ReasonCode) => void
  onVeto: (placeId: string) => void
  onWithdrawVeto: (vetoId: string) => void
}

/** The voting page body: who is voting, what to do, the places. No names or answers of others. */
export function VotePage({
  session,
  busyPlaceId,
  saved,
  failed,
  onRate,
  onVeto,
  onWithdrawVeto,
}: VotePageProps) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <h1 className="font-semibold text-2xl leading-tight">
          {m.vote_page_title({ name: session.profile_name })}
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          {m.vote_page_intro({ trip: session.trip_name })}
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">{m.vote_page_help()}</p>
      </header>

      {/* One live region: it announces the thank-you or the failure, never both. */}
      <p
        role={failed ? 'alert' : 'status'}
        className={failed ? 'text-destructive text-sm' : 'min-h-5 font-medium text-sm'}
      >
        {failed ? m.vote_write_failed() : saved ? m.vote_thanks() : ''}
      </p>

      {session.places.length === 0 ? (
        <p className="border-t py-8 text-muted-foreground">{m.vote_no_places()}</p>
      ) : (
        <ul aria-label={m.vote_places_label()} className="flex flex-col divide-y border-y">
          {session.places.map((place) => (
            <VotePlaceItem
              key={place.place_id}
              place={place}
              busy={busyPlaceId === place.place_id}
              onRate={(value, reason) => onRate(place.place_id, value, reason)}
              onVeto={() => onVeto(place.place_id)}
              onWithdrawVeto={() => place.veto_id && onWithdrawVeto(place.veto_id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

export function VotePageSkeleton(): ReactNode {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
