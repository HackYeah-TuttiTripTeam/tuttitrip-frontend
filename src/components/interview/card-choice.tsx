import type { InterviewCard } from '@/api/interview-agent'
import { Button } from '@/components/ui/button'

interface CardChoiceProps {
  card: InterviewCard
  disabled: boolean
  onAnswer: (answer: string) => void
}

/** Choice card, also used as the closing confirmation (kind "confirm"). */
export function CardChoice({ card, disabled, onAnswer }: CardChoiceProps) {
  const confirm = card.kind === 'confirm'
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-4">
      <legend className="px-1 font-medium text-sm leading-relaxed">{card.question}</legend>
      <div className="flex flex-wrap gap-2">
        {card.options.map((option, index) => (
          <Button
            key={option}
            className="h-11"
            variant={confirm && index === 0 ? 'default' : 'outline'}
            disabled={disabled}
            onClick={() => onAnswer(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </fieldset>
  )
}
