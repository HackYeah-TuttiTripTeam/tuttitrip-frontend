import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { InterviewCard } from '@/lib/interview'
import { answerSlider } from '@/lib/interview-answers'
import { SLIDER_DEFAULT, SLIDER_STEPS } from '@/lib/interview-constants'
import { m } from '@/paraglide/messages'
import { CardFrame } from './card-frame'

interface CardSliderProps {
  card: InterviewCard
  disabled: boolean
  onAnswer: (answer: string) => void
}

/** A value from 1 to 5; the first and second option name the two ends. */
export function CardSlider({ card, disabled, onAnswer }: CardSliderProps) {
  const [value, setValue] = useState(SLIDER_DEFAULT)
  const [low, high] = card.options
  return (
    <CardFrame question={card.question}>
      <div className="flex flex-col gap-3">
        <Slider
          min={1}
          max={SLIDER_STEPS}
          step={1}
          value={[value]}
          disabled={disabled}
          thumbLabels={[card.question]}
          thumbValueText={(_, current) =>
            m.interview_slider_value({ value: current, max: SLIDER_STEPS })
          }
          onValueChange={([next = SLIDER_DEFAULT]) => setValue(next)}
          className="my-2"
        />
        <div className="flex items-center justify-between gap-3 text-muted-foreground text-sm">
          <span>{low}</span>
          <span className="font-medium text-foreground tabular-nums">
            {m.interview_slider_value({ value, max: SLIDER_STEPS })}
          </span>
          <span className="text-right">{high}</span>
        </div>
      </div>
      <Button
        className="h-11 self-start rounded-full px-6"
        disabled={disabled}
        onClick={() => onAnswer(answerSlider(card.question, value))}
      >
        {m.interview_card_submit()}
      </Button>
    </CardFrame>
  )
}
