import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { ALPHA_DEFAULT, ALPHA_MAX, ALPHA_MIN, ALPHA_STEP } from '@/lib/fairness'
import { formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'

interface FairnessAlphaSliderProps {
  /** The trip's `fairness_alpha`. */
  value: number
  /** A member sees the setting but does not change it. */
  readOnly: boolean
  /** A recalculation is running. */
  busy: boolean
  /** The last recalculation left the plan as it was. */
  unchanged: boolean
  /** Called once when the thumb is released. */
  onCommit: (alpha: number) => void
}

/** Where the default sits on the track, in percent. */
const DEFAULT_AT = ((ALPHA_DEFAULT - ALPHA_MIN) / (ALPHA_MAX - ALPHA_MIN)) * 100

/**
 * The fairness slider (E5): 0 favours the total benefit, 1 is the balanced default, 3 favours
 * equality. The value shown follows the thumb while it moves; the save happens on release.
 */
export function FairnessAlphaSlider({
  value,
  readOnly,
  busy,
  unchanged,
  onCommit,
}: FairnessAlphaSliderProps) {
  const [draft, setDraft] = useState(value)
  const [seen, setSeen] = useState(value)
  // The saved value changed under us (another save, a reload): the thumb follows it.
  if (value !== seen) {
    setSeen(value)
    setDraft(value)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="alpha-slider" className="font-medium">
          {m.alpha_title()}
        </label>
        <span className="font-heading font-semibold tabular-nums">
          {draft === ALPHA_DEFAULT
            ? m.alpha_value_default({ value: formatNumber(draft, 1) })
            : formatNumber(draft, 1)}
        </span>
      </div>
      <p className="text-muted-foreground text-sm leading-[22px]">{m.alpha_hint()}</p>
      <div className="px-3 pt-2">
        <Slider
          id="alpha-slider"
          min={ALPHA_MIN}
          max={ALPHA_MAX}
          step={ALPHA_STEP}
          value={[draft]}
          disabled={readOnly || busy}
          thumbLabels={[m.alpha_title()]}
          thumbValueText={(_, current) =>
            current === ALPHA_DEFAULT
              ? m.alpha_value_default({ value: formatNumber(current, 1) })
              : formatNumber(current, 1)
          }
          onValueChange={([next]) => next !== undefined && setDraft(next)}
          onValueCommit={([next]) => next !== undefined && next !== value && onCommit(next)}
        />
        <div className="relative mt-1 h-4" aria-hidden="true">
          <span
            className="absolute top-0 h-2 w-0.5 -translate-x-1/2 rounded-full bg-muted-foreground"
            style={{ left: `${DEFAULT_AT}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between gap-4 text-muted-foreground text-sm leading-5">
        <span>{m.alpha_end_utility()}</span>
        <span className="text-right">{m.alpha_end_equality()}</span>
      </div>
      {readOnly && (
        <p className="text-muted-foreground text-sm leading-[22px]">{m.alpha_read_only()}</p>
      )}
      {unchanged && (
        <p role="status" className="text-sm leading-[22px]">
          {m.alpha_unchanged()}
        </p>
      )}
    </div>
  )
}
