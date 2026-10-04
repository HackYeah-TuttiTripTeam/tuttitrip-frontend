import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ACCOMMODATION_MAX_CHARS, ROOM_MAX_CHARS } from '@/lib/trip-extras'
import { m } from '@/paraglide/messages'

/** Mirrors CheckinUpdate: accommodation 1 to 200 characters, room empty or up to 20. */
const checkinSchema = z.object({
  profileId: z.string().min(1),
  accommodation: z
    .string()
    .trim()
    .min(1, { error: () => m.checkin_accommodation_required() })
    .max(ACCOMMODATION_MAX_CHARS, { error: () => m.checkin_accommodation_max() }),
  room: z
    .string()
    .trim()
    .max(ROOM_MAX_CHARS, { error: () => m.checkin_room_max() }),
})

type CheckinValues = z.infer<typeof checkinSchema>

export interface CheckinPerson {
  profileId: string
  name: string
}

interface CheckinFormProps {
  /** Whose entry the caller may set: themselves, and for a host also people without an account. */
  people: CheckinPerson[]
  /** The profile to start with, and the values already saved for it. */
  initial: { profileId: string; accommodation: string; room: string }
  /** Looks up the saved entry of the person picked in the form. */
  savedFor: (profileId: string) => { accommodation: string; room: string }
  isSubmitting: boolean
  /** Why the save failed, already worded; null when it did not. */
  error: string | null
  onSubmit: (profileId: string, accommodation: string, room: string | null) => void
  onCancel: () => void
}

/** Where a person stays and the room number; the host picks whose entry it is. */
export function CheckinForm({
  people,
  initial,
  savedFor,
  isSubmitting,
  error,
  onSubmit,
  onCancel,
}: CheckinFormProps) {
  const form = useForm<CheckinValues>({
    resolver: zodResolver(checkinSchema),
    defaultValues: initial,
  })
  const { errors } = form.formState
  const profileId = form.watch('profileId')

  return (
    <form
      noValidate
      className="flex flex-col gap-4 pb-4"
      onSubmit={form.handleSubmit((values) =>
        onSubmit(values.profileId, values.accommodation, values.room || null),
      )}
    >
      {people.length > 1 && (
        <Field>
          <Label htmlFor="checkin-person">{m.checkin_person_label()}</Label>
          <Select
            value={profileId}
            onValueChange={(next) => {
              form.setValue('profileId', next)
              const saved = savedFor(next)
              form.setValue('accommodation', saved.accommodation)
              form.setValue('room', saved.room)
            }}
          >
            <SelectTrigger id="checkin-person" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {people.map((person) => (
                <SelectItem key={person.profileId} value={person.profileId}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <Field data-invalid={Boolean(errors.accommodation)}>
        <Label htmlFor="checkin-accommodation">{m.checkin_accommodation_label()}</Label>
        <Input
          id="checkin-accommodation"
          autoComplete="off"
          className="h-11"
          placeholder={m.checkin_accommodation_placeholder()}
          aria-invalid={Boolean(errors.accommodation)}
          {...form.register('accommodation')}
        />
        <FieldError errors={[errors.accommodation]} />
      </Field>

      <Field data-invalid={Boolean(errors.room)}>
        <Label htmlFor="checkin-room">{m.checkin_room_label()}</Label>
        <Input
          id="checkin-room"
          autoComplete="off"
          className="h-11"
          placeholder={m.checkin_room_placeholder()}
          aria-invalid={Boolean(errors.room)}
          {...form.register('room')}
        />
        <FieldError errors={[errors.room]} />
      </Field>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-11" onClick={onCancel}>
          {m.action_cancel()}
        </Button>
        <Button type="submit" className="h-11" disabled={isSubmitting}>
          {isSubmitting ? m.checkin_saving() : m.checkin_save()}
        </Button>
      </div>
    </form>
  )
}
