import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/errors'
import {
  type Diet,
  type Preferences,
  type PreferencesWrite,
  preferencesQueryOptions,
} from '@/api/queries/preferences'
import type { Profile } from '@/api/queries/profiles'
import { editDefaults, type SaveResult } from '@/lib/people'
import { type ConstraintsValues, toConstraints, toWrite } from '@/lib/preferences'
import { m } from '@/paraglide/messages'
import { useProfileActions } from './use-profile-actions'
import { useUpdatePreferences } from './use-update-preferences'

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

/** Saves for the details of one person: constraints, diet and interests. */
export function usePersonActions(tripId: string, profile: Profile) {
  const queryClient = useQueryClient()
  const update = useUpdatePreferences(tripId, profile.id)
  const profileActions = useProfileActions(tripId)
  const queryKey = preferencesQueryOptions(tripId, profile.id).queryKey

  /** Puts `patch` on top of the freshest preferences, which include the saves still on their way. */
  async function save(patch: PreferencesWrite): Promise<SaveResult> {
    const current = queryClient.getQueryData<Preferences>(queryKey)
    if (!current) return failure(null)
    try {
      await update.mutateAsync({
        params: { path: { trip_id: tripId, profile_id: profile.id } },
        body: toWrite(current, patch),
      })
      return OK
    } catch (error) {
      return failure(error)
    }
  }

  return {
    setDiet: (diet: Diet) => save({ diet }),
    setInterests: (interests: Preferences['interests']) => save({ interests }),
    async saveConstraints(values: ConstraintsValues): Promise<SaveResult> {
      const { segment_km, daily_km, nap_minutes, nap_start } = values
      const comfort = await profileActions.edit(profile, {
        ...editDefaults(profile),
        segment_km,
        daily_km,
        nap_minutes,
        nap_start,
      })
      if (!comfort.ok) return comfort
      return save({ constraints: toConstraints(values) })
    },
  }
}
