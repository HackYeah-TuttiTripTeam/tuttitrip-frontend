import { Button } from '@/components/ui/button'
import type { InterviewCard } from '@/lib/interview'
import { CardFrame } from './card-frame'

interface CardProps {
  card: InterviewCard
  disabled: boolean
  onAnswer: (answer: string) => void
}

/** One tap answers: the options as large buttons. Also the closing confirmation ("confirm"). */
export function CardChoice({ card, disabled, onAnswer }: CardProps) {
  const confirm = card.kind === 'confirm'
  return (
    <CardFrame question={card.question}>
      <div className="flex flex-wrap gap-2">
        {card.options.map((option, index) => (
          <Button
            key={option}
            className="h-11 rounded-full px-5"
            variant={confirm && index === 0 ? 'default' : 'outline'}
            disabled={disabled}
            onClick={() => onAnswer(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </CardFrame>
  )
}
