import { useQueryClient } from '@tanstack/react-query'
import { $api } from '@/api/client'
import type { Access, FeatureGrant } from '@/api/queries/permissions'
import type { Feature } from '@/lib/permissions'

const PREFIX = '/api/v1/admin/permissions'

/** Every write changes what several lists show (roles, users, effective levels, audit): refetch all. */
export function usePermissionActions() {
  const queryClient = useQueryClient()
  const onSuccess = () =>
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        typeof queryKey[1] === 'string' && queryKey[1].startsWith(PREFIX),
    })
  const options = { onSuccess }

  const createRole = $api.useMutation('post', `${PREFIX}/roles`, options)
  const updateRole = $api.useMutation('put', `${PREFIX}/roles/{name}`, options)
  const deleteRole = $api.useMutation('delete', `${PREFIX}/roles/{name}`, options)
  const assignRole = $api.useMutation('put', `${PREFIX}/users/{sub}/roles/{role}`, options)
  const revokeRole = $api.useMutation('delete', `${PREFIX}/users/{sub}/roles/{role}`, options)
  const setGrant = $api.useMutation('put', `${PREFIX}/users/{sub}/grants/{feature}`, options)
  const revokeGrant = $api.useMutation('delete', `${PREFIX}/users/{sub}/grants/{feature}`, options)

  const everyMutation = [
    createRole,
    updateRole,
    deleteRole,
    assignRole,
    revokeRole,
    setGrant,
    revokeGrant,
  ]

  return {
    isBusy: everyMutation.some((mutation) => mutation.isPending),
    /** The last write's error, whichever it was. */
    error: everyMutation.find((mutation) => mutation.isError)?.error ?? null,
    reset: () => {
      for (const mutation of everyMutation) mutation.reset()
    },
    createRole: (name: string, description: string, grants: FeatureGrant[]) =>
      createRole.mutateAsync({ body: { name, description, grants } }),
    updateRole: (name: string, description: string, grants: FeatureGrant[]) =>
      updateRole.mutateAsync({ params: { path: { name } }, body: { description, grants } }),
    deleteRole: (name: string) => deleteRole.mutateAsync({ params: { path: { name } } }),
    assignRole: (sub: string, role: string) =>
      assignRole.mutateAsync({ params: { path: { sub, role } } }),
    revokeRole: (sub: string, role: string) =>
      revokeRole.mutateAsync({ params: { path: { sub, role } } }),
    setGrant: (sub: string, feature: Feature, level: Access) =>
      setGrant.mutateAsync({ params: { path: { sub, feature } }, body: { level } }),
    revokeGrant: (sub: string, feature: Feature) =>
      revokeGrant.mutateAsync({ params: { path: { sub, feature } } }),
  }
}
