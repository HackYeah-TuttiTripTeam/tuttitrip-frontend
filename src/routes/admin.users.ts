import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import {
  adminUsersHead,
  adminUsersSearchDefaults,
  adminUsersSearchSchema,
  loadAdminUsers,
} from '@/loaders/admin-users'
import { AdminUsersView } from '@/views/admin-users-view'

export const Route = createFileRoute('/admin/users')({
  head: adminUsersHead,
  validateSearch: adminUsersSearchSchema,
  search: { middlewares: [stripSearchParams(adminUsersSearchDefaults)] },
  loaderDeps: ({ search }) => search,
  loader: loadAdminUsers,
  component: AdminUsersView,
})
