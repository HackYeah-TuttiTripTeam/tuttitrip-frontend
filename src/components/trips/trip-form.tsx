import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown } from '@keyline-icons/react'
import { type ReactNode, useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { City } from '@/api/queries/cities'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  effectiveCurrency,
  kindFromDates,
  type TripFormField,
  type TripFormValues,
  tripFormSchema,
} from '@/lib/trip-form'
import { m } from '@/paraglide/messages'
import { BudgetFlexField, BudgetRangeField } from './budget-range-field'

const NO_CITY = '__none__'

interface TripFormProps {
  initial: TripFormValues
  /** The trip's stored currency, the fallback when no city is chosen. */
  tripCurrency?: string | null
  cities: City[]
  /** Server-side 422 messages, per field. */
  fieldErrors: Partial<Record<TripFormField, string>>
  /** Server-side error that belongs to no field. */
  submitError: string | null
  isSubmitting: boolean
  submitLabel: string
  submittingLabel: string
  onSubmit: (values: TripFormValues) => void
  /** Extra actions under the submit button, e.g. "Delete trip". */
  footer?: ReactNode
}

/** One form for creating and editing a trip: name, destination, city, dates, day window, budget. */
export function TripForm({
  initial,
  tripCurrency,
  cities,
  fieldErrors,
  submitError,
  isSubmitting,
  submitLabel,
  submittingLabel,
  onSubmit,
  footer,
}: TripFormProps) {
  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: initial,
  })
  const { errors } = form.formState

  useEffect(() => {
    for (const [field, message] of Object.entries(fieldErrors)) {
      form.setError(field as TripFormField, { type: 'server', message })
    }
  }, [fieldErrors, form.setError])

  const [startDate, endDate, citySlug, scope, min, max] = form.watch([
    'startDate',
    'endDate',
    'citySlug',
    'budgetScope',
    'budgetMin',
    'budgetMax',
  ])
  const city = cities.find((c) => c.slug === citySlug)
  const currency = effectiveCurrency(citySlug, cities, tripCurrency)
  const kind = kindFromDates(startDate, endDate)
  const invalid = (field: TripFormField) => Boolean(errors[field])
  const showDetails = Boolean(
    initial.budgetMin ||
      initial.budgetMax ||
      initial.dayStart !== '09:00' ||
      initial.dayEnd !== '21:00',
  )
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const detailsInvalid = (
    ['dayStart', 'dayEnd', 'budgetMin', 'budgetMax', 'flexPct'] as const
  ).some((field) => errors[field])
  // An error inside the closed section must not stay hidden.
  useEffect(() => {
    if (detailsInvalid && detailsRef.current) detailsRef.current.open = true
  }, [detailsInvalid])
  const touch = (field: TripFormField, value: string) =>
    form.setValue(field, value, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <FieldGroup className="gap-5">
        <Field data-invalid={invalid('name')}>
          <FieldLabel htmlFor="trip-name">{m.trip_form_name_label()}</FieldLabel>
          <Input
            id="trip-name"
            autoComplete="off"
            placeholder={m.trip_form_name_placeholder()}
            aria-invalid={invalid('name')}
            className="h-11 md:h-9"
            {...form.register('name')}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={invalid('destination')}>
          <FieldLabel htmlFor="trip-destination">{m.trip_form_destination_label()}</FieldLabel>
          <Input
            id="trip-destination"
            autoComplete="off"
            placeholder={m.trip_form_destination_placeholder()}
            aria-invalid={invalid('destination')}
            className="h-11 md:h-9"
            {...form.register('destination')}
          />
          <FieldDescription>{m.trip_form_destination_hint()}</FieldDescription>
          <FieldError errors={[errors.destination]} />
        </Field>

        {cities.length > 0 && (
          <Field data-invalid={invalid('citySlug')}>
            <FieldLabel htmlFor="trip-city">{m.trip_form_city_label()}</FieldLabel>
            <Controller
              control={form.control}
              name="citySlug"
              render={({ field }) => (
                <Select
                  value={field.value || NO_CITY}
                  onValueChange={(value) => field.onChange(value === NO_CITY ? '' : value)}
                >
                  <SelectTrigger
                    id="trip-city"
                    className="h-11 w-full md:h-9"
                    aria-invalid={invalid('citySlug')}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CITY}>{m.trip_form_city_none()}</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldDescription>{m.trip_form_city_hint()}</FieldDescription>
            <FieldError errors={[errors.citySlug]} />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={invalid('startDate')}>
            <FieldLabel htmlFor="trip-start">{m.trip_form_start_label()}</FieldLabel>
            <Input
              id="trip-start"
              type="date"
              aria-invalid={invalid('startDate')}
              className="h-11 md:h-9"
              {...form.register('startDate')}
            />
            <FieldError errors={[errors.startDate]} />
          </Field>
          <Field data-invalid={invalid('endDate')}>
            <FieldLabel htmlFor="trip-end">{m.trip_form_end_label()}</FieldLabel>
            <Input
              id="trip-end"
              type="date"
              min={startDate || undefined}
              aria-invalid={invalid('endDate')}
              className="h-11 md:h-9"
              {...form.register('endDate')}
            />
            <FieldError errors={[errors.endDate]} />
          </Field>
        </div>
        {kind && (
          <p className="-mt-2 text-muted-foreground text-sm" aria-live="polite">
            {kind === 'outing' ? m.trip_form_kind_outing() : m.trip_form_kind_trip()}
          </p>
        )}

        <details ref={detailsRef} open={showDetails} className="group border-t pt-1">
          <summary className="flex h-11 cursor-pointer list-none items-center justify-between rounded-md font-medium text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
            {m.trip_form_more()}
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="mt-3 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={invalid('dayStart')}>
                <FieldLabel htmlFor="trip-day-start">{m.trip_form_day_start_label()}</FieldLabel>
                <Input
                  id="trip-day-start"
                  type="time"
                  aria-invalid={invalid('dayStart')}
                  className="h-11 md:h-9"
                  {...form.register('dayStart')}
                />
                <FieldError errors={[errors.dayStart]} />
              </Field>
              <Field data-invalid={invalid('dayEnd')}>
                <FieldLabel htmlFor="trip-day-end">{m.trip_form_day_end_label()}</FieldLabel>
                <Input
                  id="trip-day-end"
                  type="time"
                  aria-invalid={invalid('dayEnd')}
                  className="h-11 md:h-9"
                  {...form.register('dayEnd')}
                />
                <FieldError errors={[errors.dayEnd]} />
              </Field>
            </div>
            <p className="-mt-3 text-muted-foreground text-sm">
              {city ? m.trip_form_day_hint_zone({ zone: city.timezone }) : m.trip_form_day_hint()}
            </p>

            <BudgetRangeField
              scope={scope}
              min={min}
              max={max}
              currency={currency}
              onScopeChange={(next) => {
                // Nothing is converted between a whole-trip and a per-day amount.
                touch('budgetScope', next)
                touch('budgetMin', '')
                touch('budgetMax', '')
              }}
              onRangeChange={(from, to) => {
                touch('budgetMin', from)
                touch('budgetMax', to)
              }}
              onMinChange={(value) => touch('budgetMin', value)}
              onMaxChange={(value) => touch('budgetMax', value)}
              minError={errors.budgetMin?.message}
              maxError={errors.budgetMax?.message}
            />
            {(min || max) && (
              <Controller
                control={form.control}
                name="flexPct"
                render={({ field }) => (
                  <BudgetFlexField value={field.value} onChange={field.onChange} />
                )}
              />
            )}
          </div>
        </details>
      </FieldGroup>

      {submitError && (
        <p role="alert" className="text-destructive text-sm">
          {submitError}
        </p>
      )}

      {footer}

      {/* Stays in view while the fields scroll under it. */}
      <div className="sticky bottom-0 -mx-1 border-t bg-background px-1 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button type="submit" disabled={isSubmitting} className="h-11 w-full md:h-9">
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}
