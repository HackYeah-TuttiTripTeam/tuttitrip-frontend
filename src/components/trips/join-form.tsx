import { zodResolver } from '@hookform/resolvers/zod'
import { MapPin } from '@keyline-icons/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { ClaimableProfile } from '@/api/queries/invitations'
import { CLAIM_NEW, ClaimProfileChoice } from '@/components/trips/claim-profile-choice'
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
  /** People of the trip without an account; the joiner may be one of them. */
  claimable: ClaimableProfile[]
  /** Pre-filled with the account's name. */
  defaultName: string
  isSubmitting: boolean
  submitError: string | null
  onSubmit: (displayName: string | null, profileId: string | null) => void
}

/** Confirms the join: trip name, how you will be called, one button. */
export function JoinForm({
  tripName,
  destination,
  alreadyMember,
  claimable,
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
  const [picked, setPicked] = useState('')
  // A pick that is no longer offered (taken meanwhile, list refreshed) counts as no pick.
  const choice =
    picked === CLAIM_NEW || claimable.some((p) => p.profile_id === picked) ? picked : ''
  const asking = !alreadyMember && claimable.length > 0
  const claiming = asking && choice !== '' && choice !== CLAIM_NEW
  const needsName = !alreadyMember && !claiming && (!asking || choice === CLAIM_NEW)

  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        onSubmit(needsName ? values.name || null : null, claiming ? choice : null),
      )}
      noValidate
      className="flex max-w-md flex-col gap-6"
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-balance font-semibold text-3xl tracking-tight">{tripName}</h1>
        <p className="text-muted-foreground text-sm">{m.join_lead()}</p>
        {destination && (
          <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <MapPin aria-hidden="true" className="size-4" />
            {destination}
          </p>
        )}
      </header>

      {alreadyMember && (
        <p role="status" className="text-sm">
          {m.join_already_member()}
        </p>
      )}

      {asking && <ClaimProfileChoice profiles={claimable} value={choice} onChange={setPicked} />}

      {needsName && (
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

      <Button
        type="submit"
        disabled={isSubmitting || (asking && choice === '')}
        className="h-11 md:h-9"
      >
        {isSubmitting ? m.join_submitting() : alreadyMember ? m.join_open() : m.join_submit()}
      </Button>
    </form>
  )
}
