import { zodResolver } from '@hookform/resolvers/zod'
import { RefreshCcw } from '@keyline-icons/react'
import { useEffect } from 'react'
import { type UseFormReturn, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatNumber } from '@/lib/format'
import {
  describeRange,
  differs,
  GROUP_TITLES,
  PARAMETER_GROUPS,
  PARAMETERS,
  type ParameterKey,
  type ParameterSpec,
  type PlanningFormValues,
  type PlanningValues,
  planningFormSchema,
  specsOf,
} from '@/lib/planning-parameters'
import { m } from '@/paraglide/messages'

interface ParametersFormProps {
  /** Where the form starts: the version in force, or an older version loaded from the history. */
  initial: PlanningFormValues
  /** The version in force, to see what the new version would change. */
  current: PlanningValues
  /** Reading is allowed, writing is not: no way to save. */
  readOnly: boolean
  /** Server-side 422 messages, per parameter. */
  fieldErrors: Partial<Record<ParameterKey, string>>
  submitError: string | null
  isSubmitting: boolean
  onSubmit: (values: PlanningFormValues) => void
}

/** All parameters, grouped by what they change in a plan, in one form that stores a new version. */
export function ParametersForm({
  initial,
  current,
  readOnly,
  fieldErrors,
  submitError,
  isSubmitting,
  onSubmit,
}: ParametersFormProps) {
  const form = useForm<PlanningFormValues>({
    resolver: zodResolver(planningFormSchema),
    defaultValues: initial,
    mode: 'onChange',
  })
  const { errors, isValid } = form.formState
  const values = form.watch()
  const changed = PARAMETERS.filter((spec) => values[spec.key] !== current[spec.key]).length
  const canSave = !readOnly && isValid && !isSubmitting && differs(values, current)

  useEffect(() => {
    for (const [field, message] of Object.entries(fieldErrors)) {
      form.setError(field as ParameterKey, { type: 'server', message })
    }
  }, [fieldErrors, form.setError])

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-10">
      {PARAMETER_GROUPS.map((group) => (
        <section key={group} aria-labelledby={`planning-group-${group}`} className="flex flex-col">
          <h2 id={`planning-group-${group}`} className="font-heading font-semibold text-xl">
            {GROUP_TITLES[group]()}
          </h2>
          <ul className="mt-2 flex flex-col divide-y">
            {specsOf(group).map((spec) => (
              <li key={spec.key} className="py-5">
                <ParameterRow
                  spec={spec}
                  form={form}
                  current={current[spec.key]}
                  readOnly={readOnly}
                  error={errors[spec.key]?.message}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Field data-invalid={Boolean(errors.note)}>
        <FieldLabel htmlFor="planning-note">{m.planning_note_label()}</FieldLabel>
        <Textarea
          id="planning-note"
          rows={2}
          disabled={readOnly}
          placeholder={m.planning_note_placeholder()}
          aria-invalid={Boolean(errors.note)}
          {...form.register('note')}
        />
        <FieldDescription>{m.planning_note_hint()}</FieldDescription>
        <FieldError errors={[errors.note]} />
      </Field>

      {!readOnly && (
        <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 -mx-4 flex flex-col gap-2 border-t bg-background px-4 py-3 md:bottom-0 md:mx-0 md:flex-row md:items-center md:px-0">
          <Button type="submit" disabled={!canSave} className="h-11 rounded-full md:h-9">
            {isSubmitting ? m.planning_saving() : m.planning_save()}
          </Button>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {changed > 0 ? m.planning_changed({ count: changed }) : m.planning_unchanged()}
          </p>
          {submitError && (
            <p role="alert" className="text-destructive text-sm md:ml-auto">
              {submitError}
            </p>
          )}
        </div>
      )}
    </form>
  )
}

interface ParameterRowProps {
  spec: ParameterSpec
  form: UseFormReturn<PlanningFormValues>
  /** The value in force: shown when the field differs from it. */
  current: number
  readOnly: boolean
  error: string | undefined
}

function ParameterRow({ spec, form, current, readOnly, error }: ParameterRowProps) {
  const id = `planning-${spec.key}`
  const value = form.watch(spec.key)
  const restore = () =>
    form.setValue(spec.key, spec.fallback, { shouldDirty: true, shouldValidate: true })
  return (
    <Field
      data-invalid={Boolean(error)}
      className="gap-2 md:grid md:grid-cols-[1fr_14rem] md:gap-x-8"
    >
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={id} className="text-base">
          {spec.name()}
        </FieldLabel>
        <FieldDescription id={`${id}-help`}>{spec.help()}</FieldDescription>
      </div>
      <div className="flex flex-col gap-1.5">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={spec.step}
          disabled={readOnly}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-help ${id}-range`}
          className="h-11 font-heading tabular-nums md:h-9"
          {...form.register(spec.key, { valueAsNumber: true })}
        />
        <p id={`${id}-range`} className="text-muted-foreground text-sm tabular-nums">
          {m.planning_range_line({
            range: describeRange(spec),
            fallback: formatNumber(spec.fallback),
          })}
        </p>
        {value !== current && Number.isFinite(value) && (
          <p className="text-muted-foreground text-sm tabular-nums">
            {m.planning_was({ value: formatNumber(current) })}
          </p>
        )}
        <FieldError errors={[error ? { message: error } : undefined]} />
        {!readOnly && value !== spec.fallback && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 w-fit justify-start px-2 md:h-8"
            onClick={restore}
          >
            <RefreshCcw aria-hidden="true" />
            {m.planning_restore({ value: formatNumber(spec.fallback) })}
          </Button>
        )}
      </div>
    </Field>
  )
}
