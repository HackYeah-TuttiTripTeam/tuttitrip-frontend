import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { InterviewCard } from '@/lib/interview'
import { answerToggles } from '@/lib/interview-answers'
import { m } from '@/paraglide/messages'
import { CardFrame } from './card-frame'

interface CardTogglesProps {
  card: InterviewCard
  disabled: boolean
  onAnswer: (answer: string) => void
}

/** Requirements as switches ("pool in every lodging"); the answer is the list that is on. */
export function CardToggles({ card, disabled, onAnswer }: CardTogglesProps) {
  const [on, setOn] = useState<ReadonlySet<string>>(new Set())
  const toggle = (option: string, checked: boolean) =>
    setOn((previous) => {
      const next = new Set(previous)
      if (checked) next.add(option)
      else next.delete(option)
      return next
    })
  return (
    <CardFrame question={card.question}>
      <ul aria-label={m.interview_toggles_label()} className="flex flex-col divide-y border-y">
        {card.options.map((option, index) => {
          const id = `toggle-${index}`
          return (
            <li key={option} className="flex min-h-11 items-center justify-between gap-4 py-2">
              <Label htmlFor={id} className="flex-1 py-1 text-sm leading-snug">
                {option}
              </Label>
              <Switch
                id={id}
                checked={on.has(option)}
                disabled={disabled}
                onCheckedChange={(checked) => toggle(option, checked)}
              />
            </li>
          )
        })}
      </ul>
      <Button
        className="h-11 self-start rounded-full px-6"
        disabled={disabled}
        onClick={() => onAnswer(answerToggles(card.options.filter((option) => on.has(option))))}
      >
        {m.interview_card_submit()}
      </Button>
    </CardFrame>
  )
}
