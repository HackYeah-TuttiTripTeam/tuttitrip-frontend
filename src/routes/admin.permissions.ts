import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import {
  loadPermissions,
  permissionsSearchDefaults,
  permissionsSearchSchema,
} from '@/loaders/permissions'
import { PermissionsView } from '@/views/permissions-view'

export const Route = createFileRoute('/admin/permissions')({
  validateSearch: permissionsSearchSchema,
  search: { middlewares: [stripSearchParams(permissionsSearchDefaults)] },
  loader: loadPermissions,
  component: PermissionsView,
})
