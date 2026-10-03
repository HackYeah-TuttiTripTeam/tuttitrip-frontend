import { ApiError } from '@/api/errors'
import type { Profile } from '@/api/queries/profiles'
import { buildUpdate, type EditValues, type SaveResult } from '@/lib/people'
import { m } from '@/paraglide/messages'
import { useCreateProfile } from './use-create-profile'
import { useDeleteProfile } from './use-delete-profile'
import { useUpdateProfile } from './use-update-profile'

const OK: SaveResult = { ok: true }

const STATUS_MESSAGES: Record<number, () => string> = {
  403: m.people_error_forbidden,
  409: m.people_error_has_account,
  422: m.people_error_invalid,
}

function failure(error: unknown): SaveResult {
  const status = error instanceof ApiError ? error.status : null
  const message =
    (status !== null ? STATUS_MESSAGES[status]?.() : undefined) ??
    (error instanceof TypeError ? m.people_error_offline() : m.people_error_generic())
  return { ok: false, message }
}

/** Create, correct and remove people of one trip. */
export function useProfileActions(tripId: string) {
  const create = useCreateProfile(tripId)
  const update = useUpdateProfile(tripId)
  const remove = useDeleteProfile(tripId)

  return {
    async add(values: { display_name: string; age: number }): Promise<SaveResult> {
      try {
        await create.mutateAsync({ params: { path: { trip_id: tripId } }, body: values })
        return OK
      } catch (error) {
        return failure(error)
      }
    },
    async edit(profile: Profile, values: EditValues): Promise<SaveResult> {
      const body = buildUpdate(profile, values)
      if (Object.keys(body).length === 0) return OK
      try {
        await update.mutateAsync({
          params: { path: { trip_id: tripId, profile_id: profile.id } },
          body,
        })
        return OK
      } catch (error) {
        return failure(error)
      }
    },
    async remove(profile: Profile): Promise<SaveResult> {
      try {
        await remove.mutateAsync({ params: { path: { trip_id: tripId, profile_id: profile.id } } })
        return OK
      } catch (error) {
        return failure(error)
      }
    },
  }
}
