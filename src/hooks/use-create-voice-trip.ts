import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { VOICE_START_FLAG } from '@/lib/constants'
import { m } from '@/paraglide/messages'
import { useCreateTrip } from './use-create-trip'

/**
 * A trip started by voice: only the name is sent (the rest of `TripCreate` is optional), then the
 * browser goes to the Wywiad tab with `voice=1`, which starts the call.
 */
export function useCreateVoiceTrip(onCreated: () => void) {
  const create = useCreateTrip()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const submit = async (name: string) => {
    setSubmitError(null)
    try {
      const trip = await create.mutateAsync({ body: { name } })
      onCreated()
      await navigate({
        to: '/trips/$tripId',
        params: { tripId: trip.id },
        search: { tab: 'interview', voice: VOICE_START_FLAG },
      })
    } catch {
      setSubmitError(m.trip_form_save_failed())
    }
  }

  return { submit, isPending: create.isPending, submitError, reset: () => setSubmitError(null) }
}
