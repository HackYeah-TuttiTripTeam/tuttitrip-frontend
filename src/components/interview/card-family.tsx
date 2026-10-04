import { Minus, Plus } from '@keyline-icons/react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { InterviewCard } from '@/lib/interview'
import { answerFamily, type FamilyPerson } from '@/lib/interview-answers'
import { FAMILY_AGE_MAX, FAMILY_MAX_PEOPLE, FAMILY_NAME_MAX_CHARS } from '@/lib/interview-constants'
import { m } from '@/paraglide/messages'
import { CardFrame } from './card-frame'

interface CardFamilyProps {
  card: InterviewCard
  disabled: boolean
  onAnswer: (answer: string) => void
}

/**
 * Who is going. The people go to the assistant as the answer, and its tools save them, so the
 * assistant knows about every change; this card never calls the API itself.
 */
export function CardFamily({ card, disabled, onAnswer }: CardFamilyProps) {
  const [people, setPeople] = useState<FamilyPerson[]>([])
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [invalid, setInvalid] = useState(false)

  const add = (event: FormEvent) => {
    event.preventDefault()
    const years = Number(age)
    const valid =
      name.trim() !== '' &&
      age.trim() !== '' &&
      Number.isInteger(years) &&
      years >= 0 &&
      years <= FAMILY_AGE_MAX &&
      people.length < FAMILY_MAX_PEOPLE
    setInvalid(!valid)
    if (!valid) return
    setPeople((previous) => [...previous, { name: name.trim(), age: years }])
    setName('')
    setAge('')
  }

  return (
    <CardFrame question={card.question}>
      {people.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.interview_family_empty()}</p>
      ) : (
        <ul aria-label={m.interview_family_list()} className="flex flex-col divide-y border-y">
          {people.map((person, index) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: two people may share a name and an age
              key={index}
              className="flex min-h-11 items-center justify-between gap-3 py-1 text-sm"
            >
              <span>{m.interview_family_person({ name: person.name, age: person.age })}</span>
              <Button
                variant="ghost"
                className="size-11"
                disabled={disabled}
                aria-label={m.interview_family_remove({ name: person.name })}
                onClick={() => setPeople(people.filter((_, at) => at !== index))}
              >
                <Minus aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form noValidate onSubmit={add} className="flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <Input
            aria-label={m.interview_family_name()}
            placeholder={m.interview_family_name()}
            className="h-11"
            maxLength={FAMILY_NAME_MAX_CHARS}
            value={name}
            disabled={disabled}
            aria-invalid={invalid}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            aria-label={m.interview_family_age()}
            placeholder={m.interview_family_age()}
            className="h-11"
            inputMode="numeric"
            value={age}
            disabled={disabled}
            aria-invalid={invalid}
            onChange={(event) => setAge(event.target.value)}
          />
        </div>
        {invalid && (
          <p role="alert" className="text-destructive text-sm">
            {m.interview_family_invalid({ max: FAMILY_AGE_MAX })}
          </p>
        )}
        <Button type="submit" variant="outline" className="h-11 self-start" disabled={disabled}>
          <Plus aria-hidden="true" />
          {m.interview_family_add()}
        </Button>
      </form>
      <Button
        className="h-11 self-start rounded-full px-6"
        disabled={disabled || people.length === 0}
        onClick={() => onAnswer(answerFamily(people))}
      >
        {m.interview_card_submit()}
      </Button>
    </CardFrame>
  )
}
