import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { ApiError } from '@/api/errors'
import { adminUsersKey } from '@/api/queries/admin-users'
import { m } from '@/paraglide/messages'
import type { ActionResult } from './use-member-actions'

const STATUS_MESSAGES: Record<number, () => string> = {
  403: m.admin_users_error_forbidden,
  404: m.admin_users_error_gone,
  409: m.admin_users_error_protected,
  502: m.admin_users_error_auth0,
  503: m.admin_users_error_auth0,
}

function describe(error: unknown): string {
  if (error instanceof TypeError) return m.people_error_offline()
  const known = error instanceof ApiError ? STATUS_MESSAGES[error.status] : undefined
  return known ? known() : m.people_error_generic()
}

async function attempt(run: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await run()
    return { ok: true }
  } catch (error) {
    return { ok: false, message: describe(error) }
  }
}

/** Block, unblock and delete an account; the list is refetched after each. */
export function useAdminUserActions() {
  const queryClient = useQueryClient()
  const options = { onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUsersKey }) }
  const block = $api.useMutation('post', '/api/v1/admin/users/{sub}/block', options)
  const unblock = $api.useMutation('delete', '/api/v1/admin/users/{sub}/block', options)
  const remove = $api.useMutation('delete', '/api/v1/admin/users/{sub}', options)

  return {
    isPending: block.isPending || unblock.isPending || remove.isPending,
    block: (sub: string) => attempt(() => block.mutateAsync({ params: { path: { sub } } })),
    unblock: (sub: string) => attempt(() => unblock.mutateAsync({ params: { path: { sub } } })),
    remove: (sub: string) => attempt(() => remove.mutateAsync({ params: { path: { sub } } })),
  }
}
