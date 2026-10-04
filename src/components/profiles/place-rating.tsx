import { ThumbsDown, ThumbsUp } from '@keyline-icons/react'
import { cn } from 'cn'
import { useState } from 'react'
import type { RatingValue, ReasonCode } from '@/api/queries/vetoes'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { m } from '@/paraglide/messages'

/** The reasons of the dictionary, in the order shown; a reason is data for the algorithm, not a comment. */
const REASONS: { code: ReasonCode; label: () => string }[] = [
  { code: 'too_expensive', label: m.reason_too_expensive },
  { code: 'too_far', label: m.reason_too_far },
  { code: 'not_my_style', label: m.reason_not_my_vibe },
  { code: 'too_crowded', label: m.reason_too_crowded },
  { code: 'too_hard_for_child', label: m.reason_too_hard_for_child },
  { code: 'other', label: m.reason_other },
]

export type RatingChoice =
  | { value: 'want' }
  | { value: 'neutral' }
  | { value: 'dont_want'; reason: ReasonCode }

interface PlaceRatingProps {
  placeName: string
  /** The person's rating now; null: none yet. */
  value: RatingValue | null
  reason: ReasonCode | null
  /** `neutral` takes the rating back; a thumb down always comes with its reason. */
  onRate: (choice: RatingChoice) => void
}

const thumb =
  'inline-flex size-11 items-center justify-center rounded-full border outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50'

/**
 * Thumbs up and down for a place. Thumbs down opens the six reasons; one touch on a reason saves
 * the rating with it. No session here: the parent decides whose rating it is, so the same piece
 * serves a voting link without a login.
 */
export function PlaceRating({ placeName, value, reason, onRate }: PlaceRatingProps) {
  const [choosing, setChoosing] = useState(false)
  const showReasons = choosing || value === 'dont_want'

  return (
    <div className="flex flex-col gap-2">
      <fieldset className="m-0 flex min-w-0 gap-2 border-0 p-0">
        <legend className="sr-only">{m.rating_group({ name: placeName })}</legend>
        <button
          type="button"
          aria-pressed={value === 'want'}
          aria-label={m.rating_want({ name: placeName })}
          className={cn(
            thumb,
            value === 'want'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input text-foreground hover:bg-secondary',
          )}
          onClick={() => {
            setChoosing(false)
            onRate({ value: value === 'want' ? 'neutral' : 'want' })
          }}
        >
          <ThumbsUp aria-hidden="true" className="size-5" />
        </button>
        <button
          type="button"
          aria-pressed={value === 'dont_want'}
          aria-expanded={showReasons}
          aria-label={m.rating_dont_want({ name: placeName })}
          className={cn(
            thumb,
            value === 'dont_want'
              ? 'border-decline bg-decline text-on-decline'
              : 'border-input text-foreground hover:bg-secondary',
          )}
          onClick={() => {
            if (value === 'dont_want') {
              setChoosing(false)
              onRate({ value: 'neutral' })
            } else {
              setChoosing((open) => !open)
            }
          }}
        >
          <ThumbsDown aria-hidden="true" className="size-5" />
        </button>
      </fieldset>
      {showReasons && (
        <div className="flex flex-col gap-1.5">
          <p className="font-medium text-sm">{m.rating_why_not()}</p>
          <ToggleGroup
            type="single"
            aria-label={m.rating_why_not()}
            value={value === 'dont_want' ? (reason ?? '') : ''}
            className="flex flex-wrap rounded-3xl"
            onValueChange={(next) => {
              const picked = REASONS.find((candidate) => candidate.code === next)
              if (!picked) return
              setChoosing(false)
              onRate({ value: 'dont_want', reason: picked.code })
            }}
          >
            {REASONS.map((candidate) => (
              <ToggleGroupItem key={candidate.code} value={candidate.code} className="px-4">
                {candidate.label()}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
    </div>
  )
}
