import type { PlanVerdict } from '@/api/queries/plans'
import { m } from '@/paraglide/messages'
import { VerdictChip } from './verdict-chip'

interface SkippedPlacesProps {
  skipped: PlanVerdict[]
  placeName: (placeId: string) => string
  onOpen: (placeId: string) => void
}

/** Places the plan left out, each with its verdict: the way to a "why not" and, for the host, to "force". */
export function SkippedPlaces({ skipped, placeName, onOpen }: SkippedPlacesProps) {
  if (skipped.length === 0) return null
  return (
    <section aria-labelledby="skipped-places" className="flex flex-col gap-2 border-t pt-4">
      <h2 id="skipped-places" className="font-medium text-base">
        {m.verdict_skipped_title()}
      </h2>
      <p className="text-muted-foreground text-sm">{m.verdict_skipped_body()}</p>
      <ul className="flex flex-col divide-y">
        {skipped.map((verdict) => (
          <li key={verdict.place_id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0 truncate text-sm">{placeName(verdict.place_id)}</span>
            <VerdictChip verdict={verdict.verdict} onClick={() => onOpen(verdict.place_id)} />
          </li>
        ))}
      </ul>
    </section>
  )
}
