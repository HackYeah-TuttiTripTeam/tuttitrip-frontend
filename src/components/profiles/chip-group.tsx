import { Check } from '@keyline-icons/react'
import { cn } from 'cn'
import { ToggleGroup } from 'radix-ui'

export interface ChipOption<T extends string> {
  value: T
  label: string
}

interface ChipGroupProps<T extends string> {
  /** Names the group for screen readers. */
  label: string
  options: ChipOption<T>[]
  value: T[]
  onChange: (next: T[]) => void
  /** Shown when `readOnly` and nothing is ticked. */
  emptyText: string
  readOnly?: boolean
}

const chipClass = cn(
  'inline-flex h-11 items-center gap-1.5 rounded-full border border-input px-4 font-medium text-sm outline-none transition-colors md:h-9',
  'hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'data-[state=on]:border-primary data-[state=on]:bg-want-soft data-[state=on]:text-want-ink',
)

/**
 * Tick any number of options. The tick icon repeats the colour, so a ticked chip is not told
 * apart by colour alone. Read only, it lists the ticked ones and nothing else.
 */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  emptyText,
  readOnly = false,
}: ChipGroupProps<T>) {
  if (readOnly) {
    const picked = options.filter((option) => value.includes(option.value))
    return picked.length === 0 ? (
      <p className="text-muted-foreground text-sm">{emptyText}</p>
    ) : (
      <ul aria-label={label} className="flex flex-wrap gap-2">
        {picked.map((option) => (
          <li
            key={option.value}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-primary bg-want-soft px-4 text-sm text-want-ink"
          >
            <Check aria-hidden="true" className="size-4" />
            {option.label}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ToggleGroup.Root
      type="multiple"
      aria-label={label}
      value={value}
      onValueChange={(next) =>
        onChange(options.filter((o) => next.includes(o.value)).map((o) => o.value))
      }
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => (
        <ToggleGroup.Item key={option.value} value={option.value} className={chipClass}>
          {value.includes(option.value) && <Check aria-hidden="true" className="size-4" />}
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
