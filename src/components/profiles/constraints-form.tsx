import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Constraints } from '@/api/queries/preferences'
import type { Profile } from '@/api/queries/profiles'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  DAILY_KM_MAX,
  DISABILITY_NOTE_INPUT_MAX_CHARS,
  DISABILITY_NOTE_MAX_CHARS,
  MINUTES_LIMIT_MAX,
  SEGMENT_KM_MAX,
} from '@/lib/constants'
import { formatNumber, formatTime } from '@/lib/format'
import type { SaveResult } from '@/lib/people'
import { shortTime } from '@/lib/people'
import {
  type ConstraintsValues,
  constraintsDefaults,
  isNapCustomized,
  isWalkCustomized,
} from '@/lib/preferences'
import { m } from '@/paraglide/messages'

const positive = (max: number) =>
  z
    .number({ error: () => m.people_form_number_invalid() })
    .gt(0, { error: () => m.people_form_number_invalid() })
    .max(max, { error: () => m.people_form_number_invalid() })

// Same bounds as the profile edit form; the server decides what an age may have.
const schema = z
  .object({
    segment_km: positive(SEGMENT_KM_MAX),
    daily_km: positive(DAILY_KM_MAX),
    nap_minutes: z
      .number({ error: () => m.people_form_nap_minutes_invalid() })
      .int({ error: () => m.people_form_nap_minutes_invalid() })
      .min(0, { error: () => m.people_form_nap_minutes_invalid() })
      .max(MINUTES_LIMIT_MAX, { error: () => m.people_form_nap_minutes_invalid() }),
    nap_start: z.string(),
    wheelchair: z.boolean(),
    stairs: z.boolean(),
    heat: z.boolean(),
    cold: z.boolean(),
    audio_description: z.boolean(),
    disability_note: z
      .string()
      .max(DISABILITY_NOTE_MAX_CHARS, { error: () => m.prefs_note_too_long() }),
  })
  .superRefine((value, ctx) => {
    if (value.segment_km > value.daily_km)
      ctx.addIssue({
        code: 'custom',
        path: ['segment_km'],
        message: m.people_form_segment_over_daily(),
      })
    if (value.nap_minutes > 0 && !value.nap_start)
      ctx.addIssue({
        code: 'custom',
        path: ['nap_start'],
        message: m.people_form_nap_start_required(),
      })
  })

type FlagName = 'wheelchair' | 'stairs' | 'heat' | 'cold' | 'audio_description'

const FLAGS: { name: FlagName; label: () => string; hint?: () => string }[] = [
  { name: 'wheelchair', label: m.prefs_wheelchair, hint: m.prefs_wheelchair_hint },
  { name: 'stairs', label: m.prefs_stairs, hint: m.prefs_stairs_hint },
  { name: 'heat', label: m.prefs_heat },
  { name: 'cold', label: m.prefs_cold },
  // Stored for the organizer; the planner does not read it (see the issue).
  { name: 'audio_description', label: m.prefs_audio, hint: m.prefs_audio_hint },
]

const inputClass = 'h-11 md:h-9'

/** Dashed = the value follows the age; solid = somebody set it by hand. */
function SourceTag({ customized }: { customized: boolean }) {
  return (
    <span
      className={`w-fit rounded-full border px-2.5 py-0.5 text-xs ${customized ? 'border-solid text-foreground' : 'border-dashed text-muted-foreground'}`}
    >
      {customized ? m.prefs_source_manual() : m.people_source_default()}
    </span>
  )
}

interface ConstraintsFormProps {
  profile: Profile
  constraints: Constraints
  onSubmit: (values: ConstraintsValues) => Promise<SaveResult>
}

/**
 * Hard conditions of one person: walking distance, nap, stairs, wheelchair, heat and cold,
 * audio description and a free note. Walking and nap start from the age and say so.
 */
export function ConstraintsForm({ profile, constraints, onSubmit }: ConstraintsFormProps) {
  const [message, setMessage] = useState<SaveResult | null>(null)
  const form = useForm<ConstraintsValues>({
    resolver: zodResolver(schema),
    values: constraintsDefaults(profile, constraints),
    resetOptions: { keepDirtyValues: true },
  })
  const { errors, isSubmitting, isDirty } = form.formState
  const napMinutes = form.watch('nap_minutes')

  const numberField = (
    name: 'segment_km' | 'daily_km' | 'nap_minutes',
    label: string,
    step: string,
    hint?: string,
  ) => (
    <Field data-invalid={Boolean(errors[name])}>
      <FieldLabel htmlFor={`constraints-${name}`}>{label}</FieldLabel>
      <Input
        id={`constraints-${name}`}
        type="number"
        inputMode={step.includes('.') ? 'decimal' : 'numeric'}
        step={step}
        aria-invalid={Boolean(errors[name])}
        className={inputClass}
        {...form.register(name, { valueAsNumber: true })}
      />
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <FieldError errors={[errors[name]]} />
    </Field>
  )

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onChange={() => setMessage(null)}
      onSubmit={form.handleSubmit(async (values) => {
        const result = await onSubmit(values)
        setMessage(result)
        if (result.ok) form.reset(values)
      })}
    >
      <ul className="flex flex-col divide-y border-y">
        {FLAGS.map(({ name, label, hint }) => (
          <li key={name}>
            <Controller
              control={form.control}
              name={name}
              render={({ field }) => (
                <div className="flex min-h-14 items-center justify-between gap-4 py-2">
                  <label htmlFor={`constraints-${name}`} className="flex flex-1 flex-col py-1">
                    <span className="text-base">{label()}</span>
                    {hint && <span className="text-muted-foreground text-sm">{hint()}</span>}
                  </label>
                  <Switch
                    id={`constraints-${name}`}
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked)
                      setMessage(null)
                    }}
                    onBlur={field.onBlur}
                  />
                </div>
              )}
            />
          </li>
        ))}
      </ul>

      <FieldGroup className="gap-5">
        <Field data-invalid={Boolean(errors.disability_note)}>
          <FieldLabel htmlFor="constraints-note">{m.prefs_note_label()}</FieldLabel>
          <Textarea
            id="constraints-note"
            maxLength={DISABILITY_NOTE_INPUT_MAX_CHARS}
            placeholder={m.prefs_note_placeholder()}
            aria-invalid={Boolean(errors.disability_note)}
            {...form.register('disability_note')}
          />
          <FieldError errors={[errors.disability_note]} />
        </Field>

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-3 font-medium text-base">{m.prefs_comfort_legend()}</legend>
          <div className="flex flex-col gap-5 md:grid md:grid-cols-2">
            {numberField('segment_km', m.people_form_segment_label(), '0.1')}
            {numberField('daily_km', m.people_form_daily_label(), '0.5')}
            <div className="md:col-span-2">
              <SourceTag customized={isWalkCustomized(profile)} />
            </div>
            {numberField(
              'nap_minutes',
              m.people_form_nap_minutes_label(),
              '5',
              m.people_form_nap_minutes_hint(),
            )}
            {Number(napMinutes) > 0 && (
              <Field data-invalid={Boolean(errors.nap_start)}>
                <FieldLabel htmlFor="constraints-nap_start">
                  {m.people_form_nap_start_label()}
                </FieldLabel>
                <Input
                  id="constraints-nap_start"
                  type="time"
                  aria-invalid={Boolean(errors.nap_start)}
                  className={inputClass}
                  {...form.register('nap_start')}
                />
                <FieldError errors={[errors.nap_start]} />
              </Field>
            )}
            <div className="md:col-span-2">
              <SourceTag customized={isNapCustomized(profile)} />
            </div>
          </div>
        </fieldset>
      </FieldGroup>

      {message && (
        <p
          role={message.ok ? 'status' : 'alert'}
          className={message.ok ? 'text-sm' : 'text-destructive text-sm'}
        >
          {message.ok ? m.prefs_saved() : message.message}
        </p>
      )}
      <Button
        type="submit"
        disabled={isSubmitting || !isDirty}
        className="h-11 md:h-9 md:self-start"
      >
        {isSubmitting ? m.prefs_saving() : m.prefs_save()}
      </Button>
    </form>
  )
}

interface ConstraintsSummaryProps {
  profile: Profile
  /** Null: the API hides the constraints from a member looking at someone else. */
  constraints: Constraints | null
}

/** The read-only version: what the planner will keep, without inputs. */
export function ConstraintsSummary({ profile, constraints }: ConstraintsSummaryProps) {
  const ticked = constraints ? FLAGS.filter(({ name }) => constraints[name]) : []
  const nap =
    profile.nap_start && profile.nap_minutes > 0
      ? m.people_nap_value({
          time: formatTime(`2000-01-01T${shortTime(profile.nap_start)}:00`),
          minutes: profile.nap_minutes,
        })
      : m.people_nap_none()

  return (
    <div className="flex flex-col gap-4">
      {constraints === null ? (
        <p className="text-muted-foreground text-sm">{m.prefs_constraints_hidden()}</p>
      ) : (
        <>
          {ticked.length === 0 ? (
            <p className="text-muted-foreground text-sm">{m.prefs_summary_none()}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {ticked.map(({ name, label }) => (
                <li
                  key={name}
                  className="inline-flex h-9 items-center rounded-full border px-4 text-sm"
                >
                  {label()}
                </li>
              ))}
            </ul>
          )}
          {constraints.disability_note && (
            <p className="whitespace-pre-line text-sm">{constraints.disability_note}</p>
          )}
        </>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{m.people_walk_label()}</dt>
        <dd className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {m.people_walk_value({
            segment: formatNumber(profile.segment_km, 1),
            daily: formatNumber(profile.daily_km, 1),
          })}
          <SourceTag customized={isWalkCustomized(profile)} />
        </dd>
        <dt className="text-muted-foreground">{m.people_nap_label()}</dt>
        <dd className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {nap}
          <SourceTag customized={isNapCustomized(profile)} />
        </dd>
      </dl>
    </div>
  )
}
