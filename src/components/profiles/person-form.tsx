import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { type FieldErrors, type UseFormReturn, useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Profile } from '@/api/queries/profiles'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { type EditValues, editDefaults, type SaveResult } from '@/lib/people'
import { m } from '@/paraglide/messages'

const name = z
  .string()
  .trim()
  .min(1, { error: () => m.people_form_name_required() })
  .max(100, { error: () => m.people_form_max_100() })
// Mirrors ProfileCreate: age 0-120 whole years. Which age group that is stays the server's call.
const age = z
  .number({ error: () => m.people_form_age_invalid() })
  .int({ error: () => m.people_form_age_invalid() })
  .min(0, { error: () => m.people_form_age_invalid() })
  .max(120, { error: () => m.people_form_age_invalid() })

export const addPersonSchema = z.object({ display_name: name, age })
export type AddPersonValues = z.infer<typeof addPersonSchema>

const positive = (max: number) =>
  z
    .number({ error: () => m.people_form_number_invalid() })
    .gt(0, { error: () => m.people_form_number_invalid() })
    .max(max, { error: () => m.people_form_number_invalid() })

// Mirrors the bounds and the two consistency rules of ProfileUpdate, not the age table.
export const editPersonSchema = z
  .object({
    display_name: name,
    age,
    segment_km: positive(50),
    daily_km: positive(100),
    active_hours: positive(24),
    stairs_sensitivity: z
      .number({ error: () => m.people_form_unit_invalid() })
      .min(0, { error: () => m.people_form_unit_invalid() })
      .max(1, { error: () => m.people_form_unit_invalid() }),
    queue_patience_min: z
      .number({ error: () => m.people_form_queue_invalid() })
      .int({ error: () => m.people_form_queue_invalid() })
      .min(0, { error: () => m.people_form_queue_invalid() })
      .max(600, { error: () => m.people_form_queue_invalid() }),
    floor: z
      .number({ error: () => m.people_form_floor_invalid() })
      .int({ error: () => m.people_form_floor_invalid() })
      .min(0, { error: () => m.people_form_floor_invalid() })
      .max(100, { error: () => m.people_form_floor_invalid() }),
    nap_start: z.string(),
    nap_minutes: z
      .number({ error: () => m.people_form_nap_minutes_invalid() })
      .int({ error: () => m.people_form_nap_minutes_invalid() })
      .min(0, { error: () => m.people_form_nap_minutes_invalid() })
      .max(600, { error: () => m.people_form_nap_minutes_invalid() }),
  })
  .superRefine((value, ctx) => {
    if (value.segment_km > value.daily_km) {
      ctx.addIssue({
        code: 'custom',
        path: ['segment_km'],
        message: m.people_form_segment_over_daily(),
      })
    }
    if (value.nap_minutes > 0 && !value.nap_start) {
      ctx.addIssue({
        code: 'custom',
        path: ['nap_start'],
        message: m.people_form_nap_start_required(),
      })
    }
  })

const inputClass = 'h-11 md:h-9'

function SubmitError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  ) : null
}

interface NameAgeFieldsProps {
  /** Distinguishes ids when two forms are mounted at once. */
  idPrefix: string
  form: Pick<UseFormReturn<{ display_name: string; age: number }>, 'register'> & {
    errors: FieldErrors<{ display_name: string; age: number }>
  }
  placeholder?: string
  ageHint?: string
}

function NameAgeFields({ idPrefix, form, placeholder, ageHint }: NameAgeFieldsProps) {
  const { register, errors } = form
  return (
    <>
      <Field data-invalid={Boolean(errors.display_name)}>
        <FieldLabel htmlFor={`${idPrefix}-name`}>{m.people_form_name_label()}</FieldLabel>
        <Input
          id={`${idPrefix}-name`}
          autoComplete="off"
          placeholder={placeholder}
          aria-invalid={Boolean(errors.display_name)}
          className={inputClass}
          {...register('display_name')}
        />
        <FieldError errors={[errors.display_name]} />
      </Field>
      <Field data-invalid={Boolean(errors.age)}>
        <FieldLabel htmlFor={`${idPrefix}-age`}>{m.people_form_age_label()}</FieldLabel>
        <Input
          id={`${idPrefix}-age`}
          type="number"
          inputMode="numeric"
          min={0}
          max={120}
          aria-invalid={Boolean(errors.age)}
          className={inputClass}
          {...register('age', { valueAsNumber: true })}
        />
        {ageHint && <FieldDescription>{ageHint}</FieldDescription>}
        <FieldError errors={[errors.age]} />
      </Field>
    </>
  )
}

interface AddPersonFormProps {
  onSubmit: (values: AddPersonValues) => Promise<SaveResult>
}

/** Name and age only: the server fills the comfort values from the age. */
export function AddPersonForm({ onSubmit }: AddPersonFormProps) {
  const [error, setError] = useState<string | null>(null)
  const form = useForm<AddPersonValues>({
    resolver: zodResolver(addPersonSchema),
    defaultValues: { display_name: '' },
  })
  const { errors, isSubmitting } = form.formState

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={form.handleSubmit(async (values) => {
        const result = await onSubmit(values)
        setError(result.ok ? null : result.message)
      })}
    >
      <FieldGroup className="gap-5">
        <NameAgeFields
          idPrefix="add-person"
          form={{ register: form.register, errors }}
          placeholder={m.people_form_name_placeholder()}
          ageHint={m.people_form_defaults_hint()}
        />
      </FieldGroup>
      <SubmitError message={error} />
      <Button type="submit" disabled={isSubmitting} className="h-11 md:h-9">
        {isSubmitting ? m.people_form_add_submitting() : m.people_form_add_submit()}
      </Button>
    </form>
  )
}

interface EditPersonFormProps {
  profile: Profile
  onSubmit: (values: EditValues) => Promise<SaveResult>
  /** Omitted when the person cannot be removed here. */
  onDelete?: () => Promise<SaveResult>
}

/** Shows what the server set (from the age) and lets the host correct the exceptions. */
export function EditPersonForm({ profile, onSubmit, onDelete }: EditPersonFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const form = useForm<EditValues>({
    resolver: zodResolver(editPersonSchema),
    defaultValues: editDefaults(profile),
  })
  const { errors, isSubmitting } = form.formState
  const napMinutes = form.watch('nap_minutes')

  const numberField = (
    key:
      | 'segment_km'
      | 'daily_km'
      | 'active_hours'
      | 'nap_minutes'
      | 'stairs_sensitivity'
      | 'queue_patience_min'
      | 'floor',
    label: string,
    step: string,
    hint?: string,
  ) => (
    <Field data-invalid={Boolean(errors[key])}>
      <FieldLabel htmlFor={`person-${key}`}>{label}</FieldLabel>
      <Input
        id={`person-${key}`}
        type="number"
        inputMode={step.includes('.') ? 'decimal' : 'numeric'}
        step={step}
        aria-invalid={Boolean(errors[key])}
        className={inputClass}
        {...form.register(key, { valueAsNumber: true })}
      />
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <FieldError errors={[errors[key]]} />
    </Field>
  )

  const remove = async () => {
    if (!onDelete) return
    setRemoving(true)
    const result = await onDelete()
    setRemoving(false)
    if (!result.ok) {
      setConfirming(false)
      setError(result.message)
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={form.handleSubmit(async (values) => {
        const result = await onSubmit(values)
        setError(result.ok ? null : result.message)
      })}
    >
      <FieldGroup className="gap-5">
        <NameAgeFields idPrefix="edit-person" form={{ register: form.register, errors }} />
        {numberField('segment_km', m.people_form_segment_label(), '0.1')}
        {numberField('daily_km', m.people_form_daily_label(), '0.5')}
        {numberField('active_hours', m.people_form_active_label(), '0.5')}
        {numberField(
          'nap_minutes',
          m.people_form_nap_minutes_label(),
          '5',
          m.people_form_nap_minutes_hint(),
        )}
        {Number(napMinutes) > 0 && (
          <Field data-invalid={Boolean(errors.nap_start)}>
            <FieldLabel htmlFor="person-nap_start">{m.people_form_nap_start_label()}</FieldLabel>
            <Input
              id="person-nap_start"
              type="time"
              aria-invalid={Boolean(errors.nap_start)}
              className={inputClass}
              {...form.register('nap_start')}
            />
            <FieldError errors={[errors.nap_start]} />
          </Field>
        )}
        {numberField(
          'stairs_sensitivity',
          m.people_form_stairs_label(),
          '0.1',
          m.people_form_stairs_hint(),
        )}
        {numberField(
          'queue_patience_min',
          m.people_form_queue_label(),
          '5',
          m.people_form_queue_hint(),
        )}
        {numberField('floor', m.people_form_floor_label(), '5', m.people_form_floor_hint())}
      </FieldGroup>
      <SubmitError message={error} />
      <div className="flex flex-col gap-3">
        <Button type="submit" disabled={isSubmitting || removing} className="h-11 md:h-9">
          {isSubmitting ? m.people_form_edit_submitting() : m.people_form_edit_submit()}
        </Button>
        {onDelete &&
          (confirming ? (
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">{m.people_delete()}</legend>
              <p className="text-sm">{m.people_delete_confirm({ name: profile.display_name })}</p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={removing}
                  onClick={remove}
                  className="h-11 flex-1 md:h-9"
                >
                  {m.people_delete_yes()}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={removing}
                  onClick={() => setConfirming(false)}
                  className="h-11 flex-1 md:h-9"
                >
                  {m.people_delete_no()}
                </Button>
              </div>
            </fieldset>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(true)}
              className="h-11 text-destructive md:h-9"
            >
              {m.people_delete()}
            </Button>
          ))}
      </div>
    </form>
  )
}
