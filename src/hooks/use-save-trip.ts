import { useState } from 'react'
import { ApiError } from '@/api/errors'
import type { City } from '@/api/queries/cities'
import type { Trip } from '@/api/queries/trips'
import {
  diffPatch,
  effectiveCurrency,
  formValuesToPatch,
  mapValidationErrors,
  type TripFormField,
  type TripFormValues,
  tripToFormValues,
} from '@/lib/trip-form'
import { m } from '@/paraglide/messages'
import { useCreateTrip } from './use-create-trip'
import { useUpdateTrip } from './use-update-trip'

export type FieldErrors = Partial<Record<TripFormField, string>>

/**
 * One save for the whole form: creating is a single POST with the full body, editing a PATCH with
 * only the changed fields. A 422 is mapped onto the fields it names.
 */
export function useSaveTrip(trip: Trip | null, cities: City[]) {
  const create = useCreateTrip()
  const update = useUpdateTrip()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const reset = () => {
    setFieldErrors({})
    setSubmitError(null)
  }

  const submit = async (values: TripFormValues): Promise<Trip | null> => {
    reset()
    setIsPending(true)
    try {
      const currency = effectiveCurrency(values.citySlug, cities, trip?.currency)
      if (!trip) {
        return await create.mutateAsync({
          body: {
            propose_cheaper_alternatives: PROPOSE_CHEAPER_DEFAULT,
            ...formValuesToPatch(values, currency),
            name: values.name.trim(),
          },
        })
      }
      const body = diffPatch(tripToFormValues(trip), values, trip.currency, currency)
      if (Object.keys(body).length === 0) return trip
      return await update.mutateAsync({ params: { path: { trip_id: trip.id } }, body })
    } catch (error) {
      const errors =
        error instanceof ApiError && error.status === 422 ? mapValidationErrors(error.detail) : {}
      if (Object.keys(errors).length > 0) setFieldErrors(errors)
      else setSubmitError(m.trip_form_save_failed())
      return null
    } finally {
      setIsPending(false)
    }
  }

  return { submit, isPending, fieldErrors, submitError, reset }
}
