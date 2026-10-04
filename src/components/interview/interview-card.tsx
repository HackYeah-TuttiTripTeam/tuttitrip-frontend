import type { InterviewCard as Card } from '@/lib/interview'
import { m } from '@/paraglide/messages'
import { CardBudgetRange } from './card-budget-range'
import { CardChoice } from './card-choice'
import { CardDotPool } from './card-dot-pool'
import { CardFamily } from './card-family'
import { CardFrame } from './card-frame'
import { CardSlider } from './card-slider'
import { CardSwipe } from './card-swipe'
import { CardToggles } from './card-toggles'

interface InterviewCardProps {
  card: Card
  /** A run is going: the answer buttons wait for it. */
  disabled: boolean
  onAnswer: (answer: string) => void
}

/** The card kind of the backend (`CardKind`, backend#59) to its component. */
export function InterviewCard({ card, disabled, onAnswer }: InterviewCardProps) {
  const props = { card, disabled, onAnswer }
  switch (card.kind) {
    case 'choice':
    case 'confirm':
      return <CardChoice {...props} />
    case 'slider':
      return <CardSlider {...props} />
    case 'requirement_toggles':
      return <CardToggles {...props} />
    case 'swipe':
      return <CardSwipe {...props} />
    case 'budget_range':
      return <CardBudgetRange {...props} />
    case 'family_builder':
      return <CardFamily {...props} />
    case 'dot_pool':
      return <CardDotPool {...props} />
    case 'text':
      return (
        <CardFrame question={card.question}>
          <p className="text-muted-foreground text-sm">{m.interview_card_unknown()}</p>
        </CardFrame>
      )
  }
}
