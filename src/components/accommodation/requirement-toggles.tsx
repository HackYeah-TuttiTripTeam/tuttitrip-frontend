import type { ReactNode } from 'react'
import type { RequirementItem } from '@/api/queries/accommodation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  AMENITY_KEYS,
  DEFAULT_MAX_DISTANCE_M,
  DISTANCE_KEY,
  DISTANCE_STEP_M,
  PLATFORM_KEYS,
  requirementLabel,
  withoutRequirement,
  withRequirement,
} from '@/lib/accommodation'
import { m } from '@/paraglide/messages'

interface RequirementTogglesProps {
  requirements: RequirementItem[]
  /** Host and co-host change the set; a member only reads it. */
  canManage: boolean
  /** Applies a change to the set (the hook sends the whole new set to the API). */
  onChange: (update: (current: RequirementItem[]) => RequirementItem[]) => void
}

const NO_PLATFORM = 'any'

/**
 * The switches of the lodging contract: amenities, one platform and a distance. Each one is hard
 * (a miss rules the offer out) or soft (a miss only counts against it). They apply to the one
 * lodging base of the whole trip.
 */
export function RequirementToggles({ requirements, canManage, onChange }: RequirementTogglesProps) {
  const find = (kind: RequirementItem['kind'], key: string) =>
    requirements.find((item) => item.kind === kind && item.key === key)
  const platform = requirements.find((item) => item.kind === 'platform')
  const distance = find('distance', DISTANCE_KEY)

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="requirements-amenities" className="flex flex-col">
        <h3 id="requirements-amenities" className="font-medium text-sm">
          {m.requirements_amenities()}
        </h3>
        <ul className="mt-1 divide-y">
          {AMENITY_KEYS.map((key) => {
            const item = find('amenity', key)
            return (
              <ToggleRow
                key={key}
                id={`requirement-${key}`}
                label={requirementLabel('amenity', key)}
                checked={item !== undefined}
                disabled={!canManage}
                onCheckedChange={(on) =>
                  onChange((current) =>
                    on
                      ? withRequirement(current, { kind: 'amenity', key, hard: false })
                      : withoutRequirement(current, 'amenity', key),
                  )
                }
              >
                {item && (
                  <Strength
                    hard={item.hard}
                    disabled={!canManage}
                    label={requirementLabel('amenity', key)}
                    onChange={(hard) =>
                      onChange((current) => withRequirement(current, { ...item, hard }))
                    }
                  />
                )}
              </ToggleRow>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="requirements-platform" className="flex flex-col gap-2">
        <h3 id="requirements-platform" className="font-medium text-sm">
          {m.requirements_platform()}
        </h3>
        <ToggleGroup
          type="single"
          value={platform?.key ?? NO_PLATFORM}
          disabled={!canManage}
          aria-labelledby="requirements-platform"
          onValueChange={(value) => {
            if (!value) return
            onChange((current) => {
              const rest = current.filter((item) => item.kind !== 'platform')
              const key = PLATFORM_KEYS.find((candidate) => candidate === value)
              return key ? [...rest, { kind: 'platform', key, hard: true }] : rest
            })
          }}
        >
          <ToggleGroupItem value={NO_PLATFORM}>{m.requirements_platform_any()}</ToggleGroupItem>
          {PLATFORM_KEYS.map((key) => (
            <ToggleGroupItem key={key} value={key}>
              {requirementLabel('platform', key)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-muted-foreground text-xs">{m.requirements_platform_hint()}</p>
      </section>

      <section aria-labelledby="requirements-distance" className="flex flex-col">
        <h3 id="requirements-distance" className="sr-only">
          {m.requirements_distance()}
        </h3>
        <ul>
          <ToggleRow
            id="requirement-distance"
            label={m.requirements_distance()}
            checked={distance !== undefined}
            disabled={!canManage}
            onCheckedChange={(on) =>
              onChange((current) =>
                on
                  ? withRequirement(current, {
                      kind: 'distance',
                      key: DISTANCE_KEY,
                      hard: false,
                      max_distance_m: DEFAULT_MAX_DISTANCE_M,
                    })
                  : withoutRequirement(current, 'distance', DISTANCE_KEY),
              )
            }
          >
            {distance && (
              <div className="flex flex-wrap items-center gap-3">
                <Label className="flex items-center gap-2 text-sm">
                  <span>{m.requirements_distance_max()}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={DISTANCE_STEP_M}
                    step={DISTANCE_STEP_M}
                    disabled={!canManage}
                    defaultValue={distance.max_distance_m ?? DEFAULT_MAX_DISTANCE_M}
                    className="h-11 w-28 font-mono tabular-nums md:h-9"
                    onBlur={(event) => {
                      const meters = Number(event.target.value)
                      if (meters > 0 && meters !== distance.max_distance_m) {
                        onChange((current) =>
                          withRequirement(current, { ...distance, max_distance_m: meters }),
                        )
                      }
                    }}
                  />
                  <span>{m.requirements_distance_unit()}</span>
                </Label>
                <Strength
                  hard={distance.hard}
                  disabled={!canManage}
                  label={m.requirements_distance()}
                  onChange={(hard) =>
                    onChange((current) => withRequirement(current, { ...distance, hard }))
                  }
                />
              </div>
            )}
          </ToggleRow>
        </ul>
      </section>
    </div>
  )
}

interface ToggleRowProps {
  id: string
  label: string
  checked: boolean
  disabled: boolean
  onCheckedChange: (on: boolean) => void
  children?: ReactNode
}

function ToggleRow({ id, label, checked, disabled, onCheckedChange, children }: ToggleRowProps) {
  return (
    <li className="flex flex-col gap-2 py-2">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
      </div>
      {children}
    </li>
  )
}

interface StrengthProps {
  hard: boolean
  disabled: boolean
  label: string
  onChange: (hard: boolean) => void
}

/** Hard or soft for one requirement. */
function Strength({ hard, disabled, label, onChange }: StrengthProps) {
  return (
    <ToggleGroup
      type="single"
      value={hard ? 'hard' : 'soft'}
      disabled={disabled}
      aria-label={m.requirements_strength({ label })}
      className="w-full sm:w-64"
      onValueChange={(value) => {
        if (value) onChange(value === 'hard')
      }}
    >
      <ToggleGroupItem value="hard">{m.requirements_hard()}</ToggleGroupItem>
      <ToggleGroupItem value="soft">{m.requirements_soft()}</ToggleGroupItem>
    </ToggleGroup>
  )
}
