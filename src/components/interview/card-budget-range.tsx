import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { formatDecimal } from '@/lib/format'
import type { InterviewCard } from '@/lib/interview'
import { answerBudget } from '@/lib/interview-answers'
import {
  BUDGET_DEFAULT_FROM,
  BUDGET_DEFAULT_TO,
  BUDGET_SLIDER_MAX,
  BUDGET_STEP,
  DEFAULT_CURRENCY,
} from '@/lib/interview-constants'
import { m } from '@/paraglide/messages'
import { CardFrame } from './card-frame'

interface CardBudgetRangeProps {
  card: InterviewCard
  disabled: boolean
  onAnswer: (answer: string) => void
}

/** Budget from-to as a two-thumb slider; the first option may name the currency (PLN by default). */
export function CardBudgetRange({ card, disabled, onAnswer }: CardBudgetRangeProps) {
  const currency = card.options[0] ?? DEFAULT_CURRENCY
  const [range, setRange] = useState<[number, number]>([BUDGET_DEFAULT_FROM, BUDGET_DEFAULT_TO])
  const [from, to] = range
  const money = (amount: number) => formatDecimal(String(amount), currency)
  return (
    <CardFrame question={card.question}>
      <Slider
        min={0}
        max={BUDGET_SLIDER_MAX}
        step={BUDGET_STEP}
        minStepsBetweenThumbs={0}
        value={range}
        disabled={disabled}
        thumbLabels={[m.interview_budget_from(), m.interview_budget_to()]}
        thumbValueText={(index, value) =>
          (index === 0 ? m.interview_budget_thumb_from : m.interview_budget_thumb_to)({
            amount: money(value),
          })
        }
        onValueChange={([low = 0, high = BUDGET_SLIDER_MAX]) => setRange([low, high])}
        className="my-2"
      />
      <div className="flex items-center justify-between gap-3 text-sm tabular-nums">
        <span>
          <span className="text-muted-foreground">{m.interview_budget_from()} </span>
          <span className="font-medium">{money(from)}</span>
        </span>
        <span>
          <span className="text-muted-foreground">{m.interview_budget_to()} </span>
          <span className="font-medium">{money(to)}</span>
        </span>
      </div>
      <Button
        className="h-11 self-start rounded-full px-6"
        disabled={disabled}
        onClick={() => onAnswer(answerBudget(from, to, currency))}
      >
        {m.interview_card_submit()}
      </Button>
    </CardFrame>
  )
}
