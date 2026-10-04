import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { InterviewCard } from '@/lib/interview'
import { answerDates, type CardValue } from '@/lib/interview-answers'
import { m } from '@/paraglide/messages'
import { CardFrame } from './card-frame'

interface CardDateRangeProps {
  card: InterviewCard
  disabled: boolean
  onAnswer: (answer: string, value?: CardValue) => void
}

/** When: the first and the last day. One day is a day trip (both dates equal). */
export function CardDateRange({ card, disabled, onAnswer }: CardDateRangeProps) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [tried, setTried] = useState(false)
  const reversed = start !== '' && end !== '' && end < start
  const complete = start !== '' && end !== '' && !reversed
  const submit = () => {
    setTried(true)
    if (complete) onAnswer(answerDates(start, end), { kind: 'date_range', start, end })
  }
  return (
    <CardFrame question={card.question}>
      <div className="grid grid-cols-2 gap-3">
        <Field data-invalid={tried && start === ''}>
          <FieldLabel htmlFor="card-dates-start">{m.interview_dates_start()}</FieldLabel>
          <Input
            id="card-dates-start"
            type="date"
            className="h-11"
            value={start}
            disabled={disabled}
            aria-invalid={tried && start === ''}
            onChange={(event) => setStart(event.target.value)}
          />
        </Field>
        <Field data-invalid={reversed || (tried && end === '')}>
          <FieldLabel htmlFor="card-dates-end">{m.interview_dates_end()}</FieldLabel>
          <Input
            id="card-dates-end"
            type="date"
            className="h-11"
            min={start || undefined}
            value={end}
            disabled={disabled}
            aria-invalid={reversed || (tried && end === '')}
            onChange={(event) => setEnd(event.target.value)}
          />
        </Field>
      </div>
      {(reversed || (tried && !complete)) && (
        <FieldError>
          {reversed ? m.interview_dates_invalid() : m.interview_dates_required()}
        </FieldError>
      )}
      <Button className="h-11 self-start rounded-full px-6" disabled={disabled} onClick={submit}>
        {m.interview_card_submit()}
      </Button>
    </CardFrame>
  )
}
