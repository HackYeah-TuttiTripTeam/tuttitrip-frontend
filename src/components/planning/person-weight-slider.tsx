import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { WEIGHT_MAX, WEIGHT_MIN, WEIGHT_STEP } from '@/lib/fairness'
import { formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'

interface PersonWeightSliderProps {
  name: string
  weight: number
  readOnly: boolean
  disabled: boolean
  /** Called once when the thumb is released. */
  onCommit: (weight: number) => void
}

/** One person's weight: the number beside the slider follows the thumb, the save is on release. */
export function PersonWeightSlider({
  name,
  weight,
  readOnly,
  disabled,
  onCommit,
}: PersonWeightSliderProps) {
  const [draft, setDraft] = useState(weight)
  const [seen, setSeen] = useState(weight)
  if (weight !== seen) {
    setSeen(weight)
    setDraft(weight)
  }

  return (
    <li className="grid grid-cols-[minmax(0,7rem)_1fr_3.5rem] items-center gap-x-3">
      <span className="truncate text-sm leading-[22px]">{name}</span>
      {!readOnly && (
        <Slider
          min={WEIGHT_MIN}
          max={WEIGHT_MAX}
          step={WEIGHT_STEP}
          value={[draft]}
          disabled={disabled}
          thumbLabels={[m.weights_person_label({ name })]}
          thumbValueText={(_, current) => m.weights_value({ value: formatNumber(current, 1) })}
          onValueChange={([next]) => next !== undefined && setDraft(next)}
          onValueCommit={([next]) => next !== undefined && next !== weight && onCommit(next)}
        />
      )}
      <span
        className={`text-right font-heading font-semibold tabular-nums ${readOnly ? 'col-span-2' : ''}`}
      >
        {m.weights_value({ value: formatNumber(draft, 1) })}
      </span>
    </li>
  )
}
