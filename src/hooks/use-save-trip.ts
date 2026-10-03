import { useRef, useState } from 'react'
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
 * One save for the whole form. Editing is a PATCH. Creating is a POST (the API takes only name and
 * destination there) followed by a PATCH with the rest; when that second call fails, the trip
 * exists already, so a retry goes straight to the PATCH instead of creating a duplicate.
 */
export function useSaveTrip(trip: Trip | null, cities: City[]) {
  const create = useCreateTrip()
  const update = useUpdateTrip()
  const createdId = useRef<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const reset = () => {
    createdId.current = null
    setFieldErrors({})
    setSubmitError(null)
  }

  const submit = async (values: TripFormValues): Promise<Trip | null> => {
    setFieldErrors({})
    setSubmitError(null)
    setIsPending(true)
    try {
      const currency = effectiveCurrency(values.citySlug, cities, trip?.currency)
      let id = trip?.id ?? createdId.current
      if (!id) {
        const created = await create.mutateAsync({
          body: { name: values.name.trim(), destination: values.destination.trim() || null },
        })
        id = created.id
        createdId.current = id
      }
      // Editing sends only what changed; right after the POST everything is new.
      const body = trip
        ? diffPatch(tripToFormValues(trip), values, trip.currency, currency)
        : formValuesToPatch(values, currency)
      if (trip && Object.keys(body).length === 0) return trip
      return await update.mutateAsync({ params: { path: { trip_id: id } }, body })
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

  return { submit, isPending, fieldErrors, submitError, reset, createdId: createdId.current }
}
