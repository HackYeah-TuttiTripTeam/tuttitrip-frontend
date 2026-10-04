import { useQuery, useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import { planQueryOptions } from '@/api/queries/plans'
import { pendingReplansKey, pendingReplansQueryOptions } from '@/api/queries/replan'
import { replanFailure } from './use-replan'

/**
 * The replans of members waiting for the host, with "approve" and "reject". Approving makes the
 * change the active plan (the plan is fetched again); rejecting leaves the previous version.
 * Only the host and co-host ask; the API answers 403 to others.
 */
export function usePendingApprovals(tripId: string, enabled: boolean) {
  const queryClient = useQueryClient()
  const query = useQuery({ ...pendingReplansQueryOptions(tripId), enabled, retry: false })
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: pendingReplansKey(tripId) }),
      queryClient.invalidateQueries({ queryKey: planQueryOptions(tripId).queryKey }),
    ])
  }
  const approve = $api.useMutation('post', '/api/v1/trips/{trip_id}/replans/{replan_id}/approve', {
    onSuccess: refresh,
  })
  const reject = $api.useMutation('post', '/api/v1/trips/{trip_id}/replans/{replan_id}/reject', {
    onSuccess: refresh,
  })
  const decide = (kind: 'approve' | 'reject', replanId: string) =>
    (kind === 'approve' ? approve : reject).mutate({
      params: { path: { trip_id: tripId, replan_id: replanId } },
      body: {},
    })
  const busy = approve.isPending
    ? approve.variables
    : reject.isPending
      ? reject.variables
      : undefined
  const failed = approve.isError ? approve.error : reject.isError ? reject.error : null
  return {
    pending: query.data?.items ?? [],
    approve: (replanId: string) => decide('approve', replanId),
    reject: (replanId: string) => decide('reject', replanId),
    busyId: busy?.params.path.replan_id ?? null,
    error: failed ? replanFailure(failed) : null,
  }
}
