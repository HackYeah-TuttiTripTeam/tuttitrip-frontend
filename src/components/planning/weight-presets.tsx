import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { WeightPresetId } from '@/lib/fairness'
import { m } from '@/paraglide/messages'

const PRESETS: { id: WeightPresetId; label: () => string }[] = [
  { id: 'po_rowno', label: m.weights_preset_equal },
  { id: 'pod_dzieci', label: m.weights_preset_children },
  { id: 'dzien_babci', label: m.weights_preset_grandma },
]

interface WeightPresetsProps {
  /** The preset the stored weights match; null for a custom setting. */
  active: WeightPresetId | null
  /** Whom "Dzień babci" raises; the people to pick from. */
  focusId: string | null
  people: { id: string; name: string }[]
  disabled: boolean
  onPreset: (preset: WeightPresetId, focusId?: string) => void
}

/** Three ready weight settings; "Dzień babci" also asks whose day it is. */
export function WeightPresets({ active, focusId, people, disabled, onPreset }: WeightPresetsProps) {
  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        type="single"
        aria-label={m.weights_presets_label()}
        value={active ?? ''}
        disabled={disabled}
        onValueChange={(next) => {
          const preset = PRESETS.find((candidate) => candidate.id === next)
          if (preset)
            onPreset(
              preset.id,
              preset.id === 'dzien_babci' ? (focusId ?? people[0]?.id) : undefined,
            )
        }}
      >
        {PRESETS.map((preset) => (
          <ToggleGroupItem key={preset.id} value={preset.id} className="whitespace-normal">
            {preset.label()}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {active === 'dzien_babci' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-[22px]">{m.weights_focus_label()}</p>
          <ToggleGroup
            type="single"
            aria-label={m.weights_focus_label()}
            value={focusId ?? ''}
            disabled={disabled}
            className="flex flex-wrap rounded-3xl"
            onValueChange={(next) => next && onPreset('dzien_babci', next)}
          >
            {people.map((person) => (
              <ToggleGroupItem key={person.id} value={person.id} className="px-4">
                {person.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
    </div>
  )
}
