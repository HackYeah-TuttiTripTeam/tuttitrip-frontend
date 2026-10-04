import { useEffect, useState } from 'react'
import type { Trip } from '@/api/queries/trips'
import type { CardValue } from '@/lib/interview-answers'
import type { MissingInput, PlanFailureInfo } from '@/lib/plan-failure'
import { tripToFormValues } from '@/lib/trip-form'
import { m } from '@/paraglide/messages'
import { useCities } from './use-cities'
import { useCitySearch } from './use-city-search'
import { useProfileActions } from './use-profile-actions'
import { useSaveTrip } from './use-save-trip'
import { useSession } from './use-session'

interface UseMissingInputsOptions {
  trip: Trip
  /** Why the last "Build plan" failed, or null. */
  failure: PlanFailureInfo | null
  /** The error object itself: a new one starts a new round of questions. */
  error: Error | null
  /** Build the plan again; called when the last question is answered. */
  retry: () => void
}

/**
 * The questions behind a plan that lacks data. Each answer is saved with the same calls the trip
 * form and the people tab use; when the last one is saved the plan is built again by itself. If the
 * server still misses something, the next failure brings the next questions.
 */
export function useMissingInputs({ trip, failure, error, retry }: UseMissingInputsOptions) {
  const session = useSession()
  const { cities } = useCities(session.status)
  const citySearch = useCitySearch(session.status)
  const saveTrip = useSaveTrip(trip, cities)
  const people = useProfileActions(trip.id)
  const [answered, setAnswered] = useState<MissingInput['field'][]>([])
  const [dismissed, setDismissed] = useState(false)
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new failure is a new round
  useEffect(() => {
    setAnswered([])
    setDismissed(false)
    setProblem(null)
  }, [error])

  const queue = (failure?.missing ?? []).filter((input) => !answered.includes(input.field))
  const current = queue[0]
  const total = (failure?.missing ?? []).length

  const save = async (input: MissingInput, value: CardValue): Promise<string | null> => {
    const form = tripToFormValues(trip)
    if (value.kind === 'city' && input.field === 'destination') {
      const saved = await saveTrip.submit({
        ...form,
        destination: value.name,
        citySlug: value.slug,
      })
      return saved ? null : m.plan_missing_save_failed()
    }
    if (value.kind === 'date_range' && input.field === 'dates') {
      const saved = await saveTrip.submit({ ...form, startDate: value.start, endDate: value.end })
      return saved ? null : m.plan_missing_save_failed()
    }
    if (value.kind === 'family_builder' && input.field === 'people') {
      for (const person of value.people) {
        const result = await people.add({ display_name: person.name, age: person.age })
        if (!result.ok) return result.message
      }
      return null
    }
    return m.plan_missing_save_failed()
  }

  const answer = async (input: MissingInput, value: CardValue) => {
    setPending(true)
    setProblem(null)
    const failed = await save(input, value)
    setPending(false)
    if (failed) {
      setProblem(failed)
      return
    }
    setAnswered((previous) => [...previous, input.field])
    if (queue.length === 1) retry()
  }

  return {
    open: current !== undefined && !dismissed,
    current,
    step: total - queue.length + 1,
    total,
    pending,
    problem,
    citySearch,
    answer,
    /** Closes the dialog; the plan screen keeps a button to open it again. */
    dismiss: () => setDismissed(true),
    reopen: () => setDismissed(false),
  }
}
