import type { Provider } from '@/lib/account'
import type { UserSortKey } from '@/loaders/admin-users'
import { m } from '@/paraglide/messages'

export const USER_SORT_LABELS: Record<UserSortKey, () => string> = {
  created_at: m.admin_users_sort_created_at,
  last_login: m.admin_users_sort_last_login,
  email: m.admin_users_sort_email,
}

export const PROVIDER_LABELS: Record<Provider, () => string> = {
  google: m.provider_google,
  discord: m.provider_discord,
  password: m.provider_password,
  other: m.provider_other,
}
