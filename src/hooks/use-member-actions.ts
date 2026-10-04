import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { ApiError } from '@/api/errors'
import type { Member } from '@/api/queries/members'
import { tripsListKey } from '@/api/queries/trips'
import { m } from '@/paraglide/messages'
import { isQueryOfTrip } from './use-delete-trip'

export type ActionResult = { ok: true } | { ok: false; message: string }

const OK: ActionResult = { ok: true }

const STATUS_MESSAGES: Record<number, () => string> = {
  403: m.members_error_forbidden,
  404: m.members_error_gone,
  409: m.members_error_conflict,
}

/** The API's answer in words; the buttons are hidden by role, but the API has the last word. */
export function describeMemberError(error: unknown): string {
  if (error instanceof TypeError) return m.people_error_offline()
  const known = error instanceof ApiError ? STATUS_MESSAGES[error.status] : undefined
  return known ? known() : m.people_error_generic()
}

async function attempt(run: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await run()
    return OK
  } catch (error) {
    return { ok: false, message: describeMemberError(error) }
  }
}

/**
 * Membership writes of one trip. Every success refetches what the answer changes: the members,
 * the trip (`my_role`, `my_status`), the people (a removed account frees its profile) and the list.
 * Leaving is the exception: `onLeft` navigates away first.
 */
export function useMemberActions(tripId: string, onLeft: () => Promise<void> | void) {
  const queryClient = useQueryClient()
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        predicate: (query) => isQueryOfTrip(query.queryKey, tripId),
      }),
      queryClient.invalidateQueries({ queryKey: tripsListKey }),
    ])
  }
  const path = { trip_id: tripId }
  const options = { onSuccess: refresh }

  const setRole = $api.useMutation('patch', '/api/v1/trips/{trip_id}/members/{profile_id}', options)
  const remove = $api.useMutation('delete', '/api/v1/trips/{trip_id}/members/{profile_id}', options)
  const transfer = $api.useMutation(
    'post',
    '/api/v1/trips/{trip_id}/members/{profile_id}/host',
    options,
  )
  const confirm = $api.useMutation('post', '/api/v1/trips/{trip_id}/membership/confirm', options)
  // After leaving, the trip is a 404 for the caller: go away first, then drop its queries, so the
  // page that is still mounted never refetches into the error (same order as useDeleteTrip).
  const leave = $api.useMutation('post', '/api/v1/trips/{trip_id}/membership/leave', {
    onSuccess: async () => {
      await onLeft()
      queryClient.removeQueries({ predicate: (query) => isQueryOfTrip(query.queryKey, tripId) })
      await queryClient.invalidateQueries({ queryKey: tripsListKey })
    },
  })

  return {
    isPending:
      setRole.isPending ||
      remove.isPending ||
      transfer.isPending ||
      confirm.isPending ||
      leave.isPending,
    setRole: (member: Member, role: 'member' | 'co_host') =>
      attempt(() =>
        setRole.mutateAsync({
          params: { path: { ...path, profile_id: member.profile_id } },
          body: { role },
        }),
      ),
    remove: (member: Member) =>
      attempt(() =>
        remove.mutateAsync({ params: { path: { ...path, profile_id: member.profile_id } } }),
      ),
    transferHost: (member: Member) =>
      attempt(() =>
        transfer.mutateAsync({ params: { path: { ...path, profile_id: member.profile_id } } }),
      ),
    confirm: () => attempt(() => confirm.mutateAsync({ params: { path } })),
    leave: () => attempt(() => leave.mutateAsync({ params: { path } })),
  }
}
