import { RefreshCcw, TriangleAlert } from '@keyline-icons/react'
import type { Offer } from '@/api/queries/accommodation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { RequirementChip } from './requirement-chip'

interface OfferResultProps {
  offer: Offer
  /** Checks the stored text again against the current requirements. */
  onRecheck: () => void
  rechecking: boolean
  canRecheck: boolean
}

/** The three-state result of one offer: pending, failed, or a chip per requirement. */
export function OfferResult({ offer, onRecheck, rechecking, canRecheck }: OfferResultProps) {
  const nights = offer.nights.map((night) => formatDate(`${night}T12:00:00`)).join(', ')

  return (
    <section aria-labelledby="offer-result" className="flex flex-col gap-3 border-t pt-4">
      <h2 id="offer-result" className="font-medium text-base">
        {m.offer_result_title()}
      </h2>
      <p className="text-muted-foreground text-sm">{m.offer_result_nights({ nights })}</p>

      {offer.stale && (
        <div role="status" className="flex flex-col gap-2 rounded-lg bg-muted p-4 text-sm">
          <p className="flex items-start gap-2 leading-relaxed">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {m.offer_stale()}
          </p>
          {canRecheck && (
            <Button
              variant="outline"
              className="h-11 self-start rounded-full px-5"
              disabled={rechecking}
              onClick={onRecheck}
            >
              <RefreshCcw aria-hidden="true" className={rechecking ? 'animate-spin' : undefined} />
              {m.offer_recheck()}
            </Button>
          )}
        </div>
      )}

      {offer.state === 'pending' && (
        <div role="status" className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm">{m.offer_pending()}</p>
          <Skeleton aria-hidden="true" className="h-7 w-2/3 rounded-full" />
          <Skeleton aria-hidden="true" className="h-7 w-1/2 rounded-full" />
        </div>
      )}

      {offer.state === 'failed' && (
        <div role="alert" className="flex flex-col gap-2 text-sm">
          <p className="text-destructive">{m.offer_failed()}</p>
          {canRecheck && (
            <Button
              variant="outline"
              className="h-11 self-start rounded-full px-5"
              disabled={rechecking}
              onClick={onRecheck}
            >
              {m.offer_try_again()}
            </Button>
          )}
        </div>
      )}

      {offer.state === 'done' && (
        <>
          <ul className="flex flex-col gap-3">
            {offer.checks.map((check) => (
              <RequirementChip key={`${check.kind}-${check.feature}`} check={check} />
            ))}
          </ul>
          {offer.checks.length === 0 ? (
            <p className="text-muted-foreground text-sm">{m.offer_no_requirements()}</p>
          ) : (
            <p className="text-muted-foreground text-xs">
              {m.offer_score({ score: formatNumber(offer.score) })}
            </p>
          )}
        </>
      )}
    </section>
  )
}
