import { useId, useState } from 'react'
import { CityCombobox } from '@/components/trips/city-combobox'
import type { CitySearch } from '@/lib/city-search'
import type { InterviewCard } from '@/lib/interview'
import { answerCity, type CardValue } from '@/lib/interview-answers'
import { m } from '@/paraglide/messages'
import { CardFrame } from './card-frame'

interface CardCityProps {
  card: InterviewCard
  disabled: boolean
  /** Live suggestions, owned by the screen that shows the card. */
  citySearch: CitySearch
  onAnswer: (answer: string, value?: CardValue) => void
}

/**
 * Where to: the same live city suggestions as the trip form. Picking a city answers at once; a
 * place that is not in the list can be used as typed (it has no catalog slug).
 */
export function CardCity({ card, disabled, citySearch, onAnswer }: CardCityProps) {
  const id = useId()
  const [chosen, setChosen] = useState('')
  const answer = (name: string, slug: string) => {
    setChosen(name)
    onAnswer(answerCity(name), { kind: 'city', name, slug })
  }
  return (
    <CardFrame question={card.question}>
      <CityCombobox
        id={id}
        label={m.interview_city_label()}
        value={chosen}
        search={citySearch}
        disabled={disabled}
        placeholder={m.interview_city_placeholder()}
        clearLabel={m.city_search_clear()}
        onSelect={(city) => answer(city.name, city.slug)}
        onUseTyped={(text) => answer(text, '')}
        onClear={() => setChosen('')}
      />
    </CardFrame>
  )
}
