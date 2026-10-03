import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

/** Mirrors TripCreate in the API (name 1-200 chars, destination up to 200). */
export const createTripSchema = z.object({
  name: z.string().trim().min(1, 'Nadaj wyjazdowi nazwę.').max(200, 'Maksymalnie 200 znaków.'),
  destination: z.string().trim().max(200, 'Maksymalnie 200 znaków.'),
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
          <FieldLabel htmlFor="trip-name">Nazwa</FieldLabel>
          <Input
            id="trip-name"
            autoComplete="off"
            placeholder="Majówka w Krakowie"
            aria-invalid={Boolean(errors.name)}
            className="h-11 md:h-9"
            {...form.register('name')}
          />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={Boolean(errors.destination)}>
          <FieldLabel htmlFor="trip-destination">Cel podróży</FieldLabel>
          <Input
            id="trip-destination"
            autoComplete="off"
            placeholder="Kraków"
            aria-invalid={Boolean(errors.destination)}
            className="h-11 md:h-9"
            {...form.register('destination')}
          />
          <FieldDescription>Możesz zostawić puste i ustalić później.</FieldDescription>
          <FieldError errors={[errors.destination]} />
        </Field>
      </FieldGroup>

      {submitError && (
        <p role="alert" className="text-destructive text-sm">
          {submitError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="h-11 md:h-9">
        {isSubmitting ? 'Tworzę wyjazd…' : 'Utwórz wyjazd'}
      </Button>
    </form>
  )
}
