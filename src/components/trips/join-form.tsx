import { zodResolver } from '@hookform/resolvers/zod'
import { MapPin } from '@keyline-icons/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { m } from '@/paraglide/messages'

/** Mirrors InvitationAccept: the name is optional and at most 100 characters. */
export const joinSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, { error: () => m.join_name_max() }),
})

export type JoinValues = z.infer<typeof joinSchema>

interface JoinFormProps {
  tripName: string
  destination: string | null
  alreadyMember: boolean
  /** Pre-filled with the account's name. */
  defaultName: string
  isSubmitting: boolean
  submitError: string | null
  onSubmit: (displayName: string | null) => void
}

/** Confirms the join: trip name, how you will be called, one button. */
export function JoinForm({
  tripName,
  destination,
  alreadyMember,
  defaultName,
  isSubmitting,
  submitError,
  onSubmit,
}: JoinFormProps) {
  const form = useForm<JoinValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: { name: defaultName.slice(0, 100) },
  })
  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(alreadyMember ? null : values.name || null))}
      noValidate
      className="flex max-w-md flex-col gap-6"
    >
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">{m.join_lead()}</p>
        <h1 className="text-balance font-semibold text-3xl tracking-tight">{tripName}</h1>
        {destination && (
          <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <MapPin aria-hidden="true" className="size-4" />
            {destination}
          </p>
        )}
      </header>

      {alreadyMember ? (
        <p role="status" className="text-sm">
          {m.join_already_member()}
        </p>
      ) : (
        <Field data-invalid={Boolean(errors.name)}>
          <Label htmlFor="join-name">{m.join_name_label()}</Label>
          <Input
            id="join-name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            className="h-11 md:h-9"
            {...form.register('name')}
          />
          <FieldDescription>{m.join_name_hint()}</FieldDescription>
          <FieldError errors={[errors.name]} />
        </Field>
      )}

      {submitError && (
        <p role="alert" className="text-destructive text-sm">
          {submitError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="h-11 md:h-9">
        {isSubmitting ? m.join_submitting() : alreadyMember ? m.join_open() : m.join_submit()}
      </Button>
    </form>
  )
}
