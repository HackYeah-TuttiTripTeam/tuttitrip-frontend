import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { m } from '@/paraglide/messages'

/** Mirrors TripCreate in the API (name 1-200 chars, destination up to 200). */
export const createTripSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: () => m.trip_form_name_required() })
    .max(200, { error: () => m.trip_form_max_200() }),
  destination: z
    .string()
    .trim()
    .max(200, { error: () => m.trip_form_max_200() }),
})

export type CreateTripValues = z.infer<typeof createTripSchema>

interface CreateTripFormProps {
  onSubmit: (values: CreateTripValues) => void
  isSubmitting: boolean
  /** Server-side error to show above the submit button. */
  submitError: string | null
}

export function CreateTripForm({ onSubmit, isSubmitting, submitError }: CreateTripFormProps) {
  const form = useForm<CreateTripValues>({
    resolver: zodResolver(createTripSchema),
    defaultValues: { name: '', destination: '' },
  })
  const { errors } = form.formState

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <FieldGroup className="gap-5">
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="trip-name">{m.trip_form_name_label()}</FieldLabel>
          <Input
            id="trip-name"
            autoComplete="off"
            placeholder={m.trip_form_name_placeholder()}
            aria-invalid={Boolean(errors.name)}
            className="h-11 md:h-9"
            {...form.register('name')}
          />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={Boolean(errors.destination)}>
          <FieldLabel htmlFor="trip-destination">{m.trip_form_destination_label()}</FieldLabel>
          <Input
            id="trip-destination"
            autoComplete="off"
            placeholder={m.trip_form_destination_placeholder()}
            aria-invalid={Boolean(errors.destination)}
            className="h-11 md:h-9"
            {...form.register('destination')}
          />
          <FieldDescription>{m.trip_form_destination_hint()}</FieldDescription>
          <FieldError errors={[errors.destination]} />
        </Field>
      </FieldGroup>

      {submitError && (
        <p role="alert" className="text-destructive text-sm">
          {submitError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="h-11 md:h-9">
        {isSubmitting ? m.trip_form_submitting() : m.trip_form_submit()}
      </Button>
    </form>
  )
}
