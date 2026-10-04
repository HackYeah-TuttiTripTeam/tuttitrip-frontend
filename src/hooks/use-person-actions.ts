import { ApiError } from '@/api/errors'
import type {
  Diet,
  ExamplePlace,
  ExampleVerdict,
  ImportancePool,
  Preferences,
} from '@/api/queries/preferences'
import type { Profile } from '@/api/queries/profiles'
import { editDefaults, type SaveResult } from '@/lib/people'
import {
  type ConstraintsValues,
  toConstraints,
  withoutTextExample,
  withTextExample,
} from '@/lib/preferences'
import { m } from '@/paraglide/messages'
import { useProfileActions } from './use-profile-actions'
import { useRatePlace } from './use-rate-place'
import { type PreferencesChange, useUpdatePreferences } from './use-update-preferences'

const OK: SaveResult = { ok: true }

const STATUS_MESSAGES: Record<number, () => string> = {
  403: m.prefs_error_forbidden,
  422: m.prefs_error_invalid,
}

function failure(error: unknown): SaveResult {
  const status = error instanceof ApiError ? error.status : null
  const message =
    (status !== null ? STATUS_MESSAGES[status]?.() : undefined) ??
    (error instanceof TypeError ? m.people_error_offline() : m.people_error_generic())
  return { ok: false, message }
}

/** What the liked and disliked places list adds: a catalog place (with its id) or a typed name. */
export interface NewExample {
  name: string
  placeId: string | null
  verdict: ExampleVerdict
}

/** Saves for the details of one person: constraints, diet, interests, the pool and examples. */
export function usePersonActions(tripId: string, profile: Profile) {
  const update = useUpdatePreferences(tripId, profile.id)
  const rate = useRatePlace(tripId, profile.id)
  const profileActions = useProfileActions(tripId)

  async function attempt(run: () => Promise<unknown>): Promise<SaveResult> {
    try {
      await run()
      return OK
    } catch (error) {
      return failure(error)
    }
  }
  const save = (change: PreferencesChange) => attempt(() => update.mutateAsync(change))

  return {
    setDiet: (change: (diet: Diet) => Diet) => save((current) => ({ diet: change(current.diet) })),
    setInterests: (change: (interests: Preferences['interests']) => Preferences['interests']) =>
      save((current) => ({ interests: change(current.interests) })),
    setPool: (importance_pool: ImportancePool) => save(() => ({ importance_pool })),
    /** Catalog places are rated on their own endpoint; typed names ride with the preferences. */
    addExample: ({ name, placeId, verdict }: NewExample) =>
      placeId
        ? attempt(() => rate.mutateAsync({ placeId, name, verdict }))
        : save((current) => ({
            example_places: withTextExample(current.example_places, name, verdict),
          })),
    removeExample(place: ExamplePlace) {
      const placeId = place.place_id
      return placeId
        ? attempt(() => rate.mutateAsync({ placeId, name: place.name, verdict: null }))
        : save((current) => ({
            example_places: withoutTextExample(current.example_places, place.name),
          }))
    },
    /**
     * The constraints go first: they are the safety-critical part. When the walking and nap values
     * fail after that, the message says the constraints were saved.
     */
    async saveConstraints(values: ConstraintsValues): Promise<SaveResult> {
      const constraints = await save(() => ({ constraints: toConstraints(values) }))
      if (!constraints.ok) return constraints
      const { segment_km, daily_km, nap_minutes, nap_start } = values
      const comfort = await profileActions.edit(profile, {
        ...editDefaults(profile),
        segment_km,
        daily_km,
        nap_minutes,
        nap_start,
      })
      return comfort.ok
        ? OK
        : { ok: false, message: `${m.prefs_error_partial()} ${comfort.message}` }
    },
  }
}
