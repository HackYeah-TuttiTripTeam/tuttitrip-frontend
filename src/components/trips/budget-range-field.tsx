import { cn } from 'cn'
import { useId } from 'react'
import { HelpHint } from '@/components/shared/help-hint'
import { FieldDescription, FieldError, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatDecimal } from '@/lib/format'
import { type BudgetScope, FLEX_CHOICES, moneyToNumber } from '@/lib/trip-form'
import { m } from '@/paraglide/messages'

/** Slider bounds per scope; the upper end grows when a typed amount is larger. */
const SLIDER = {
  total: { max: 10000, step: 100 },
  day: { max: 1000, step: 10 },
} as const

interface BudgetRangeFieldProps {
  scope: BudgetScope
  min: string
  max: string
  currency: string
  onScopeChange: (scope: BudgetScope) => void
  /** Both ends move together on the slider, so the form gets them in one call. */
  onRangeChange: (min: string, max: string) => void
  onMinChange: (value: string) => void
  onMaxChange: (value: string) => void
  minError?: string
  maxError?: string
}

/** Budget from-to: scope switch, two-thumb slider, and two number inputs for precision. */
export function BudgetRangeField({
  scope,
  min,
  max,
  currency,
  onScopeChange,
  onRangeChange,
  onMinChange,
  onMaxChange,
  minError,
  maxError,
}: BudgetRangeFieldProps) {
  const id = useId()
  const { step } = SLIDER[scope]
  // Display only: the form state stays the typed strings. Thumbs never invert and a missing end
  // sits at the track's end with the filled bar hidden, so half-typed input doesn't look final.
  const from = moneyToNumber(min)
  const to = moneyToNumber(max)
  const complete = from !== null && to !== null
  const sliderMax = Math.max(
    SLIDER[scope].max,
    Math.ceil(Math.max(from ?? 0, to ?? 0) / step) * step,
  )
  const lowThumb = Math.min(from ?? 0, sliderMax)
  const highThumb = Math.min(Math.max(to ?? sliderMax, lowThumb), sliderMax)
  const scopeText =
    scope === 'total'
      ? m.trip_form_budget_scope_total_value()
      : m.trip_form_budget_scope_day_value()

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

      <Slider
        min={0}
        max={sliderMax}
        step={step}
        minStepsBetweenThumbs={0}
        value={[lowThumb, highThumb]}
        thumbLabels={[m.trip_form_budget_min_label(), m.trip_form_budget_max_label()]}
        thumbValueText={(index, value) =>
          (index === 0 ? m.trip_form_budget_thumb_min : m.trip_form_budget_thumb_max)({
            amount: formatDecimal(String(value), currency),
            scope: scopeText,
          })
        }
        onValueChange={([from = 0, to = sliderMax]) => onRangeChange(String(from), String(to))}
        // Nothing chosen yet: no filled bar, it would read as "everything".
        className={cn(
          'my-2',
          !complete && '**:data-[slot=slider-range]:bg-transparent',
          from === null && to === null && '**:data-[slot=slider-thumb]:border-muted-foreground',
        )}
      />
      <div
        className="-mt-3 flex justify-between text-muted-foreground text-xs tabular-nums"
        aria-hidden="true"
      >
        <span>{formatDecimal('0', currency)}</span>
        <span>{formatDecimal(String(sliderMax), currency)}</span>
      </div>

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
