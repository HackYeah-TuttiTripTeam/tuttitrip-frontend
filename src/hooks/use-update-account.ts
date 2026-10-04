import { $api } from '@/api/client'
import { ApiError } from '@/api/errors'
import { m } from '@/paraglide/messages'
import type { ActionResult } from './use-member-actions'

/** PATCH /me/account: the caller's display name. 409 means the provider owns the name. */
export function useUpdateAccount() {
  const mutation = $api.useMutation('patch', '/api/v1/me/account')

  async function rename(name: string): Promise<ActionResult> {
    try {
      await mutation.mutateAsync({ body: { name } })
      return { ok: true }
    } catch (error) {
      if (error instanceof TypeError) return { ok: false, message: m.people_error_offline() }
      if (error instanceof ApiError && error.status === 409) {
        return { ok: false, message: m.account_settings_error_provider() }
      }
      if (error instanceof ApiError && (error.status === 502 || error.status === 503)) {
        return { ok: false, message: m.admin_users_error_auth0() }
      }
      if (error instanceof ApiError && error.status === 422) {
        return { ok: false, message: m.account_settings_error_invalid() }
      }
      return { ok: false, message: m.people_error_generic() }
    }
  }

  return { rename, isPending: mutation.isPending, account: mutation.data }
}
