import { HTTP_STATUS } from '@/api/constants'
import { ApiError } from '@/api/errors'
import type { Diet, Preferences } from '@/api/queries/preferences'
import type { Profile } from '@/api/queries/profiles'
import { editDefaults, type SaveResult } from '@/lib/people'
import { type ConstraintsValues, toConstraints } from '@/lib/preferences'
import { m } from '@/paraglide/messages'
import { useProfileActions } from './use-profile-actions'
import { type PreferencesChange, useUpdatePreferences } from './use-update-preferences'

const OK: SaveResult = { ok: true }

const STATUS_MESSAGES: Record<number, () => string> = {
  [HTTP_STATUS.forbidden]: m.prefs_error_forbidden,
  [HTTP_STATUS.unprocessable]: m.prefs_error_invalid,
}

function failure(error: unknown): SaveResult {
  const status = error instanceof ApiError ? error.status : null
  const message =
    (status !== null ? STATUS_MESSAGES[status]?.() : undefined) ??
    (error instanceof TypeError ? m.people_error_offline() : m.people_error_generic())
  return { ok: false, message }
}

/** Saves for the details of one person: constraints, diet and interests. */
export function usePersonActions(tripId: string, profile: Profile) {
  const update = useUpdatePreferences(tripId, profile.id)
  const profileActions = useProfileActions(tripId)

  async function save(change: PreferencesChange): Promise<SaveResult> {
    try {
      await update.mutateAsync(change)
      return OK
    } catch (error) {
      return failure(error)
    }
  }

  return {
    setDiet: (change: (diet: Diet) => Diet) => save((current) => ({ diet: change(current.diet) })),
    setInterests: (change: (interests: Preferences['interests']) => Preferences['interests']) =>
      save((current) => ({ interests: change(current.interests) })),
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
