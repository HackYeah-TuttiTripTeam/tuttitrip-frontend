import { $api, type Schemas } from '@/api/client'

export type Me = Schemas['MeResponse']
export type Access = Schemas['Access']
export type FeatureNode = Schemas['FeatureNode']
export type FeatureGrant = Schemas['FeatureGrant']
export type Role = Schemas['RoleRead']
export type RoleCreate = Schemas['RoleCreate']
export type RoleUpdate = Schemas['RoleUpdate']
export type UserPermissions = Schemas['UserPermissionsRead']
export type AuditEntry = Schemas['AuditEntryRead']

/** The audit endpoint's cap; the panel pages the answer on the client. */
export const AUDIT_LIMIT = 500

export const meQueryOptions = () => $api.queryOptions('get', '/api/v1/me')

export const featuresQueryOptions = () =>
  $api.queryOptions('get', '/api/v1/admin/permissions/features')

export const rolesQueryOptions = () => $api.queryOptions('get', '/api/v1/admin/permissions/roles')

export const permissionUsersQueryOptions = () =>
  $api.queryOptions('get', '/api/v1/admin/permissions/users')

export const userPermissionsQueryOptions = (sub: string) =>
  $api.queryOptions('get', '/api/v1/admin/permissions/users/{sub}', { params: { path: { sub } } })

export const auditQueryOptions = (sub: string) =>
  $api.queryOptions('get', '/api/v1/admin/permissions/audit', {
    params: { query: { ...(sub ? { sub } : {}), limit: AUDIT_LIMIT } },
  })
