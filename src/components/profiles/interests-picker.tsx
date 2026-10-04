import { useState } from 'react'
import type { InterestTag, Preferences } from '@/api/queries/preferences'
import type { SaveResult } from '@/lib/people'
import { pickedInterests, setInterest } from '@/lib/preferences'
import { m } from '@/paraglide/messages'
import { ChipGroup, type ChipOption } from './chip-group'

/**
 * Every interest tag the API knows, in the order shown. The same tags sit on places, so the
 * planner matches them. A new value in the contract fails `tsc` here until it has a label.
 */
const INTEREST_LABELS: Record<InterestTag, () => string> = {
  history: m.prefs_interest_history,
  architecture: m.prefs_interest_architecture,
  art: m.prefs_interest_art,
  museums: m.prefs_interest_museums,
  science: m.prefs_interest_science,
  religion: m.prefs_interest_religion,
  music: m.prefs_interest_music,
  nature: m.prefs_interest_nature,
  parks: m.prefs_interest_parks,
  views: m.prefs_interest_views,
  beaches: m.prefs_interest_beaches,
  sport: m.prefs_interest_sport,
  adventure: m.prefs_interest_adventure,
  family: m.prefs_interest_family,
  kids: m.prefs_interest_kids,
  nightlife: m.prefs_interest_nightlife,
  shopping: m.prefs_interest_shopping,
  markets: m.prefs_interest_markets,
  local_food: m.prefs_interest_local_food,
  street_food: m.prefs_interest_street_food,
  relaxation: m.prefs_interest_relaxation,
  animals: m.prefs_interest_animals,
  playground: m.prefs_interest_playground,
  water: m.prefs_interest_water,
  cycling: m.prefs_interest_cycling,
  wellness: m.prefs_interest_wellness,
}

const ORDER = Object.keys(INTEREST_LABELS) as InterestTag[]

const interestOptions = (): ChipOption<InterestTag>[] =>
  ORDER.map((value) => ({ value, label: INTEREST_LABELS[value]() }))

interface InterestsPickerProps {
  interests: Preferences['interests']
  /** Saves one change at once; the parent shows `interests` again, the old ones when it failed. */
  onChange: (
    change: (interests: Preferences['interests']) => Preferences['interests'],
  ) => Promise<SaveResult>
  readOnly?: boolean
}

/** Chips of the interest tags; ticking one saves at once. */
export function InterestsPicker({ interests, onChange, readOnly = false }: InterestsPickerProps) {
  const [error, setError] = useState<string | null>(null)

  // A tap clears the old message; only a failure sets one, so a later success never hides it.
  const toggle = async (tag: InterestTag, on: boolean) => {
    setError(null)
    const result = await onChange((current) => setInterest(current, tag, on))
    if (!result.ok) setError(result.message)
  }

  return (
    <div className="flex flex-col gap-3">
      <ChipGroup
        label={m.prefs_interests_title()}
        options={interestOptions()}
        value={pickedInterests(interests, ORDER)}
        onToggle={(tag, on) => void toggle(tag, on)}
        emptyText={m.prefs_interests_empty()}
        readOnly={readOnly}
      />
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
