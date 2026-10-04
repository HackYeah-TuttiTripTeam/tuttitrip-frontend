import type { PlanStop } from '@/api/queries/plans'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { m } from '@/paraglide/messages'
import { PlaceCardGoogle } from './place-card-google'
import { VerificationChip } from './verification-chip'

interface PlaceCardDialogProps {
  /** The stop whose card is open; null keeps it closed (and sends no Google query). */
  stop: PlanStop | null
  isDesktop: boolean
  apiKey: string
  language: string
  colorScheme: 'LIGHT' | 'DARK'
  onClose: () => void
}

/**
 * The Google card in a drawer (phone) or dialog (desktop), next to our own verification chips so
 * it is clear which data the plan uses: ours, not Google's.
 */
export function PlaceCardDialog({
  stop,
  isDesktop,
  apiKey,
  language,
  colorScheme,
  onClose,
}: PlaceCardDialogProps) {
  return (
    <ResponsiveModal
      open={stop !== null}
      onOpenChange={(open) => !open && onClose()}
      isDesktop={isDesktop}
      title={stop?.name ?? ''}
      description={m.place_card_description()}
    >
      {stop?.google_place_id && (
        <div className="flex flex-col gap-4 pb-4">
          <PlaceCardGoogle
            placeId={stop.google_place_id}
            apiKey={apiKey}
            language={language}
            colorScheme={colorScheme}
          />
          <div className="flex flex-col gap-2 border-t pt-4">
            <p className="text-muted-foreground text-sm">{m.place_card_ours()}</p>
            {stop.hours_verified || stop.hours_source_url ? (
              <VerificationChip
                kind="hours"
                verified={stop.hours_verified}
                verifiedAt={stop.hours_verified_at}
                sourceUrl={stop.hours_source_url}
              />
            ) : (
              <p className="text-muted-foreground text-sm">{m.plan_hours_none()}</p>
            )}
          </div>
        </div>
      )}
    </ResponsiveModal>
  )
}
