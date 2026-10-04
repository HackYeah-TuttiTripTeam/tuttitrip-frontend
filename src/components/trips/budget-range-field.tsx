import { useId } from 'react'
import { HelpHint } from '@/components/shared/help-hint'
import { FieldDescription, FieldError, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { type BudgetScope, FLEX_CHOICES } from '@/lib/trip-form'
import { m } from '@/paraglide/messages'

interface BudgetRangeFieldProps {
  scope: BudgetScope
  min: string
  max: string
  currency: string
  onScopeChange: (scope: BudgetScope) => void
  onMinChange: (value: string) => void
  onMaxChange: (value: string) => void
  minError?: string
  maxError?: string
}

/** Budget from-to: a scope switch and two amount inputs. No ceiling: any amount the API takes. */
export function BudgetRangeField({
  scope,
  min,
  max,
  currency,
  onScopeChange,
  onMinChange,
  onMaxChange,
  minError,
  maxError,
}: BudgetRangeFieldProps) {
  const id = useId()
  return (
    <FieldSet className="gap-4">
      <div className="flex items-center gap-1">
        <FieldLegend variant="label" className="mb-0">
          {m.trip_form_budget_legend()}
        </FieldLegend>
        <HelpHint id="budget" />
      </div>
      <ToggleGroup
        type="single"
        value={scope}
        aria-label={m.trip_form_budget_scope_label()}
        onValueChange={(value) => {
          if (value === 'total' || value === 'day') onScopeChange(value)
        }}
      >
        <ToggleGroupItem value="total">{m.trip_form_budget_scope_total()}</ToggleGroupItem>
        <ToggleGroupItem value="day">{m.trip_form_budget_scope_day()}</ToggleGroupItem>
      </ToggleGroup>
      <FieldDescription className="-mt-2">{m.trip_form_budget_scope_hint()}</FieldDescription>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-min`} className="font-medium text-sm">
            {m.trip_form_budget_min_label()}
          </label>
          <div className="relative">
            <Input
              id={`${id}-min`}
              inputMode="decimal"
              autoComplete="off"
              value={min}
              placeholder="0"
              aria-invalid={Boolean(minError)}
              aria-describedby={minError ? `${id}-min-err` : undefined}
              className="h-11 pr-12 tabular-nums md:h-9"
              onChange={(e) => onMinChange(e.target.value)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground text-sm">
              {currency}
            </span>
          </div>
          <FieldError id={`${id}-min-err`}>{minError}</FieldError>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-max`} className="font-medium text-sm">
            {m.trip_form_budget_max_label()}
          </label>
          <div className="relative">
            <Input
              id={`${id}-max`}
              inputMode="decimal"
              autoComplete="off"
              value={max}
              placeholder="0"
              aria-invalid={Boolean(maxError)}
              aria-describedby={maxError ? `${id}-max-err` : undefined}
              className="h-11 pr-12 tabular-nums md:h-9"
              onChange={(e) => onMaxChange(e.target.value)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground text-sm">
              {currency}
            </span>
          </div>
          <FieldError id={`${id}-max-err`}>{maxError}</FieldError>
        </div>
      </div>
    </FieldSet>
  )
}

interface FlexFieldProps {
  value: string
  onChange: (value: string) => void
}

/** Budget margin: 0, 10 or 20 percent (plus the stored value when the API holds another one). */
export function BudgetFlexField({ value, onChange }: FlexFieldProps) {
  const choices = FLEX_CHOICES.includes(value)
    ? FLEX_CHOICES
    : [...FLEX_CHOICES, value].sort((a, b) => Number(a) - Number(b))
  return (
    <FieldSet className="gap-2">
      <FieldLegend variant="label" className="mb-0">
        {m.trip_form_flex_label()}
      </FieldLegend>
      <ToggleGroup
        type="single"
        value={value}
        aria-label={m.trip_form_flex_label()}
        onValueChange={(next) => {
          if (next) onChange(next)
        }}
      >
        {choices.map((pct) => (
          <ToggleGroupItem key={pct} value={pct}>
            {pct}%
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <FieldDescription>{m.trip_form_flex_hint()}</FieldDescription>
    </FieldSet>
  )
}
