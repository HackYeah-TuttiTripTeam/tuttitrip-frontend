import { X } from '@keyline-icons/react'
import { useState } from 'react'
import type { Diet, DietTag } from '@/api/queries/preferences'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SaveResult } from '@/lib/people'
import { addAllergy, MAX_ALLERGY_LENGTH, removeAllergy, setDietTag } from '@/lib/preferences'
import { m } from '@/paraglide/messages'
import { ChipGroup, type ChipOption } from './chip-group'

/** Every diet the API knows. A new value in the contract fails `tsc` here until it has a label. */
const DIET_LABELS: Record<DietTag, () => string> = {
  vegetarian: m.prefs_diet_vegetarian,
  vegan: m.prefs_diet_vegan,
  pescatarian: m.prefs_diet_pescatarian,
  gluten_free: m.prefs_diet_gluten_free,
  lactose_free: m.prefs_diet_lactose_free,
  nut_free: m.prefs_diet_nut_free,
  halal: m.prefs_diet_halal,
  kosher: m.prefs_diet_kosher,
}

const dietOptions = (): ChipOption<DietTag>[] =>
  (Object.keys(DIET_LABELS) as DietTag[]).map((value) => ({ value, label: DIET_LABELS[value]() }))

interface DietPickerProps {
  diet: Diet
  /** Saves one change at once; the parent shows `diet` again, the old one when the save failed. */
  onChange: (change: (diet: Diet) => Diet) => Promise<SaveResult>
  readOnly?: boolean
}

/** Diet chips and free-text allergies of one person. */
export function DietPicker({ diet, onChange, readOnly = false }: DietPickerProps) {
  const [error, setError] = useState<string | null>(null)
  const [allergy, setAllergy] = useState('')
  const allergies = diet.allergies ?? []

  // A tap clears the old message; only a failure sets one, so a later success never hides it.
  const commit = async (change: (diet: Diet) => Diet) => {
    setError(null)
    const result = await onChange(change)
    if (!result.ok) setError(result.message)
  }

  const add = () => {
    const typed = allergy
    setAllergy('')
    if (addAllergy(diet, typed) !== diet) void commit((current) => addAllergy(current, typed))
  }

  return (
    <div className="flex flex-col gap-4">
      <ChipGroup
        label={m.prefs_diet_tags_label()}
        options={dietOptions()}
        value={diet.tags ?? []}
        onToggle={(tag, on) => void commit((current) => setDietTag(current, tag, on))}
        emptyText={allergies.length > 0 ? m.prefs_none() : m.prefs_diet_empty()}
        readOnly={readOnly}
      />

      <div className="flex flex-col gap-2">
        <p id="allergies-label" className="font-medium text-sm">
          {m.prefs_allergies_label()}
        </p>
        {allergies.length > 0 && (
          <ul aria-labelledby="allergies-label" className="flex flex-wrap gap-2">
            {allergies.map((item) => (
              <li
                key={item}
                className="inline-flex h-9 items-center gap-1 rounded-full border border bg-card ps-4 pe-1 text-sm"
              >
                {item}
                {!readOnly && (
                  <button
                    type="button"
                    aria-label={m.prefs_allergy_remove({ name: item })}
                    onClick={() => void commit((current) => removeAllergy(current, item))}
                    className="flex size-8 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {readOnly && allergies.length === 0 && (
          <p className="text-muted-foreground text-sm">{m.prefs_none()}</p>
        )}
        {!readOnly && (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              add()
            }}
          >
            <Input
              value={allergy}
              onChange={(event) => setAllergy(event.target.value)}
              maxLength={MAX_ALLERGY_LENGTH}
              autoComplete="off"
              aria-labelledby="allergies-label"
              placeholder={m.prefs_allergy_placeholder()}
              className="h-11 md:h-9"
            />
            <Button type="submit" variant="outline" className="h-11 md:h-9">
              {m.prefs_allergy_add()}
            </Button>
          </form>
        )}
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
