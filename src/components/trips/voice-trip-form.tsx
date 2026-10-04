import { Mic } from '@keyline-icons/react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { TRIP_NAME_MAX_CHARS } from '@/lib/constants'
import { m } from '@/paraglide/messages'

interface VoiceTripFormProps {
  isSubmitting: boolean
  /** Server-side error that belongs to no field. */
  submitError: string | null
  onSubmit: (name: string) => void
}

/** The minimum for a trip started by voice: its name. The rest is said to the assistant. */
export function VoiceTripForm({ isSubmitting, submitError, onSubmit }: VoiceTripFormProps) {
  const [name, setName] = useState('')
  const [missing, setMissing] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    setMissing(trimmed === '')
    if (trimmed !== '') onSubmit(trimmed)
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Field data-invalid={missing}>
        <FieldLabel htmlFor="voice-trip-name">{m.trip_form_name_label()}</FieldLabel>
        <Input
          id="voice-trip-name"
          autoComplete="off"
          // The modal opens on a tap; the field is the one thing to do there.
          autoFocus
          maxLength={TRIP_NAME_MAX_CHARS}
          placeholder={m.trip_form_name_placeholder()}
          aria-invalid={missing}
          className="h-11 md:h-9"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <FieldDescription>{m.trip_voice_hint()}</FieldDescription>
        {missing && <FieldError>{m.trip_form_name_required()}</FieldError>}
      </Field>
      {submitError && (
        <p role="alert" className="text-destructive text-sm">
          {submitError}
        </p>
      )}
      <Button type="submit" className="h-11 md:h-9" disabled={isSubmitting}>
        <Mic aria-hidden="true" />
        {isSubmitting ? m.trip_voice_submitting() : m.trip_voice_submit()}
      </Button>
    </form>
  )
}
