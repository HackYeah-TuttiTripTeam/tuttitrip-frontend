import { CloudOff, KeyRound, SearchX, TriangleAlert, Users } from '@keyline-icons/react'
import { getRouteApi, Navigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { AdminUser } from '@/api/queries/admin-users'
import { UsersTable, UsersTableSkeleton } from '@/components/admin/users-table'
import { UsersToolbar } from '@/components/admin/users-toolbar'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { useAdminAccess } from '@/hooks/use-admin-access'
import { useAdminUserActions } from '@/hooks/use-admin-user-actions'
import { useAdminUsers } from '@/hooks/use-admin-users'
import { useDebouncedInput } from '@/hooks/use-debounced-input'
import { useClampPage, useListSearch } from '@/hooks/use-list-search'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useSession } from '@/hooks/use-session'
import { adminUserFilterDefaults } from '@/loaders/admin-users'
import { m } from '@/paraglide/messages'

const route = getRouteApi('/admin/users')

type Pending = { kind: 'block'; user: AdminUser } | { kind: 'delete'; user: AdminUser }

const nameOf = (user: AdminUser) => user.email ?? user.name ?? user.sub

export function AdminUsersView() {
  const session = useSession()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const {
    access,
    sub: mySub,
    isPending: accessPending,
    failed: accessFailed,
    refetch: refetchAccess,
  } = useAdminAccess(session.status)
  const allowed = access !== 'NONE'
  const { search, setPage, setSize, setSort, setFilters, reset } = useListSearch(route, {
    filterDefaults: adminUserFilterDefaults,
  })
  const { users, total, pages, isPending, isPlaceholder, problem, errorStatus, refetch } =
    useAdminUsers(search, allowed)
  useClampPage(search.page, pages, setPage)
  const actions = useAdminUserActions()
  const queryInput = useDebouncedInput(search.q, (q) => setFilters({ q }))
  const [pending, setPending] = useState<Pending | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasFilters = search.q.trim() !== '' || search.blocked !== undefined
  const close = () => {
    setPending(null)
    setDialogError(null)
  }

  async function confirm() {
    if (!pending) return
    const result =
      pending.kind === 'block'
        ? await actions.block(pending.user.sub)
        : await actions.remove(pending.user.sub)
    if (result.ok) close()
    else setDialogError(result.message)
  }

  async function unblock(user: AdminUser) {
    const result = await actions.unblock(user.sub)
    setError(result.ok ? null : result.message)
  }

  if (session.status === 'anonymous') {
    return (
      <StatusMessage
        icon={<KeyRound />}
        title={m.trips_login_required_title()}
        action={<Button onClick={session.login}>{m.account_login()}</Button>}
      >
        {m.trips_login_required_body()}
      </StatusMessage>
    )
  }

  if (session.status === 'loading' || accessPending) return <UsersTableSkeleton />

  if (accessFailed) {
    return (
      <StatusMessage
        role="alert"
        icon={<TriangleAlert />}
        title={m.admin_users_load_failed_title()}
        action={
          <Button variant="outline" onClick={refetchAccess}>
            {m.action_retry()}
          </Button>
        }
      >
        {m.trips_load_failed_body()}
      </StatusMessage>
    )
  }

  // The API decides (403); this only spares people who are not administrators an empty screen.
  if (!allowed || errorStatus === 403) return <Navigate to="/trips" replace />

  const unavailable = errorStatus === 502 || errorStatus === 503
  const pastTheEnd = pages !== undefined && pages > 0 && search.page > pages
  const showList = !problem && !isPending && !pastTheEnd

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
          {m.admin_users_title()}
        </h1>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {showList && total > 0 ? m.admin_users_count({ count: total }) : m.admin_users_tagline()}
        </p>
      </div>

      <UsersToolbar
        query={queryInput.draft}
        onQueryChange={queryInput.setDraft}
        onQueryClear={queryInput.clear}
        blocked={search.blocked}
        onBlockedChange={(blocked) => setFilters({ blocked })}
        sort={search.sort}
        dir={search.dir}
        onSortChange={setSort}
        hasFilters={hasFilters}
        onReset={reset}
      />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      {isPending || pastTheEnd ? (
        <UsersTableSkeleton />
      ) : problem === 'offline' ? (
        <StatusMessage
          role="alert"
          icon={<CloudOff />}
          title={m.trips_offline_title()}
          action={
            <Button variant="outline" onClick={refetch}>
              {m.action_retry()}
            </Button>
          }
        >
          {m.trips_offline_body()}
        </StatusMessage>
      ) : problem ? (
        <StatusMessage
          role="alert"
          icon={<TriangleAlert />}
          title={m.admin_users_load_failed_title()}
          action={
            <Button variant="outline" onClick={refetch}>
              {m.action_retry()}
            </Button>
          }
        >
          {unavailable ? m.admin_users_error_auth0() : m.trips_load_failed_body()}
        </StatusMessage>
      ) : total === 0 ? (
        <StatusMessage
          icon={hasFilters ? <SearchX /> : <Users />}
          title={hasFilters ? m.admin_users_no_match_title() : m.admin_users_empty_title()}
          action={
            hasFilters ? (
              <Button variant="outline" onClick={reset}>
                {m.trips_filters_clear()}
              </Button>
            ) : undefined
          }
        >
          {hasFilters ? m.admin_users_no_match_body() : m.admin_users_empty_body()}
        </StatusMessage>
      ) : (
        <div
          aria-busy={isPlaceholder}
          className={isPlaceholder ? 'opacity-60 transition-opacity' : undefined}
        >
          <UsersTable
            users={users}
            sort={search.sort}
            dir={search.dir}
            onSortChange={setSort}
            canWrite={access === 'WRITE'}
            mySub={mySub}
            busy={actions.isPending}
            onBlock={(user) => setPending({ kind: 'block', user })}
            onUnblock={(user) => void unblock(user)}
            onDelete={(user) => setPending({ kind: 'delete', user })}
          />
        </div>
      )}

      {showList && pages !== undefined && total > 0 && (
        <PaginationBar
          page={search.page}
          pages={pages}
          size={search.size}
          total={total}
          busy={isPlaceholder}
          onPageChange={(page) => setPage(page)}
          onSizeChange={setSize}
        />
      )}

      <ConfirmDialog
        key={pending ? `${pending.kind}:${pending.user.sub}` : 'closed'}
        open={pending !== null}
        isDesktop={isDesktop}
        title={
          pending?.kind === 'delete' ? m.admin_users_delete_title() : m.admin_users_block_title()
        }
        description={
          pending?.kind === 'delete'
            ? m.admin_users_delete_body({ name: pending ? nameOf(pending.user) : '' })
            : m.admin_users_block_body({ name: pending ? nameOf(pending.user) : '' })
        }
        confirmLabel={
          pending?.kind === 'delete'
            ? m.admin_users_delete_confirm()
            : m.admin_users_block_confirm()
        }
        pending={actions.isPending}
        error={dialogError}
        typeToConfirm={
          pending?.kind === 'delete'
            ? {
                expected: nameOf(pending.user),
                label: m.admin_users_delete_type_label({ value: nameOf(pending.user) }),
              }
            : undefined
        }
        onConfirm={() => void confirm()}
        onCancel={close}
      />
    </div>
  )
}
