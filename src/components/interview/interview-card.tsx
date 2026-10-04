import type { CitySearch } from '@/lib/city-search'
import type { InterviewCard as Card } from '@/lib/interview'
import type { CardValue } from '@/lib/interview-answers'
import { CardBudgetRange } from './card-budget-range'
import { CardChoice } from './card-choice'
import { CardCity } from './card-city'
import { CardDateRange } from './card-date-range'
import { CardDotPool } from './card-dot-pool'
import { CardFamily } from './card-family'
import { CardSlider } from './card-slider'
import { CardSwipe } from './card-swipe'
import { CardToggles } from './card-toggles'

interface InterviewCardProps {
  card: Card
  /** A run is going: the answer buttons wait for it. */
  disabled: boolean
  /**
   * The sentence for the assistant and, for the cards that have one, the structured value (the
   * missing-data dialog saves from it).
   */
  onAnswer: (answer: string, value?: CardValue) => void
  /** Live suggestions for the city card. */
  citySearch: CitySearch
}

/** The card kind of the backend (`CardKind`, backend#59) to its component. */
export function InterviewCard({ card, disabled, onAnswer, citySearch }: InterviewCardProps) {
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
    case 'city':
      return <CardCity {...props} citySearch={citySearch} />
    case 'date_range':
      return <CardDateRange {...props} />
  }
}
