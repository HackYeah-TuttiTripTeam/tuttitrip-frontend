import { CloudOff, KeyRound, Plus, SearchX, ShieldCheck, TriangleAlert } from '@keyline-icons/react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ApiError } from '@/api/errors'
import { AuditList } from '@/components/permissions/audit-list'
import { DeleteRoleConfirm } from '@/components/permissions/delete-role-confirm'
import { PermissionsToolbar } from '@/components/permissions/permissions-toolbar'
import { RoleForm } from '@/components/permissions/role-form'
import { ListSkeleton, RolesList } from '@/components/permissions/roles-list'
import { UserPanel } from '@/components/permissions/user-panel'
import { UsersList } from '@/components/permissions/users-list'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebouncedInput } from '@/hooks/use-debounced-input'
import { useClampPage, useListSearch } from '@/hooks/use-list-search'
import { useMe } from '@/hooks/use-me'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { usePermissionActions } from '@/hooks/use-permission-actions'
import {
  useAudit,
  useFeatureTree,
  usePermissionUsers,
  useRoleNames,
  useRoles,
  useUserPermissions,
} from '@/hooks/use-permissions'
import { useSession } from '@/hooks/use-session'
import { detailMessage, flattenFeatures } from '@/lib/permissions'
import {
  PERMISSION_TABS,
  type PermissionTab,
  permissionFilterDefaults,
} from '@/loaders/permissions'
import { m } from '@/paraglide/messages'

const route = getRouteApi('/admin/permissions')

const TAB_LABELS: Record<PermissionTab, () => string> = {
  roles: () => m.perm_tab_roles(),
  users: () => m.perm_tab_users(),
  audit: () => m.perm_tab_audit(),
}

const isTab = (value: string): value is PermissionTab =>
  PERMISSION_TABS.some((tab) => tab === value)

/** `open` in the URL: `role:` is a new role, `role:<name>` an existing one, `user:<sub>` a user. */
function parseOpen(open: string) {
  if (open.startsWith('role:')) return { kind: 'role' as const, id: open.slice(5) }
  if (open.startsWith('user:')) return { kind: 'user' as const, id: open.slice(5) }
  return null
}

function errorText(error: unknown): string | null {
  if (!error) return null
  const detail = detailMessage(error)
  if (detail) return detail
  return error instanceof ApiError && error.status === 403
    ? m.perm_error_forbidden()
    : m.perm_error_generic()
}

export function PermissionsView() {
  const session = useSession()
  const { access, isPending: mePending, problem: meProblem } = useMe(session.status)
  const { search, setPage, setSize, setFilters, reset } = useListSearch(route, {
    filterDefaults: permissionFilterDefaults,
  })
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const actions = usePermissionActions()
  const queryInput = useDebouncedInput(search.q, (q) => setFilters({ q }))
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const allowed = access !== 'NONE'
  const readOnly = access !== 'WRITE'
  const open = parseOpen(search.open)
  const on = (tab: PermissionTab) => allowed && search.tab === tab

  const roles = useRoles(search, { enabled: on('roles') })
  const users = usePermissionUsers(search, { enabled: on('users') })
  const audit = useAudit(search, { enabled: on('audit') })
  const allRoles = useRoleNames({ enabled: allowed && open !== null })
  const tree = useFeatureTree({ enabled: allowed && open !== null })
  const rows = useMemo(() => (tree.data ? flattenFeatures(tree.data) : []), [tree.data])
  const openedUser = useUserPermissions(open?.kind === 'user' ? open.id : null)

  const list = search.tab === 'roles' ? roles : search.tab === 'users' ? users : audit
  useClampPage(search.page, list.isPending || list.problem ? undefined : list.pages, setPage)

  const setOpen = (next: string) => {
    actions.reset()
    setConfirmingDelete(false)
    setFilters({ open: next })
  }
  const closeModal = () => setOpen('')
  const error = errorText(actions.error)
  const hasFilter = search.q.trim() !== ''

  const run = (action: Promise<unknown>, afterwards?: () => void) =>
    action.then(afterwards, () => undefined)

  const editedRole =
    open?.kind === 'role' ? allRoles.roles.find((role) => role.name === open.id) : undefined
  const roleLoading = rows.length === 0 && !tree.isError
  const typedSub = search.q.trim()

  if (session.status === 'loading' || mePending) return <ListSkeleton />
  if (session.status === 'anonymous') {
    return (
      <StatusMessage
        icon={<KeyRound />}
        title={m.perm_login_title()}
        action={<Button onClick={session.login}>{m.account_login()}</Button>}
      >
        {m.perm_login_body()}
      </StatusMessage>
    )
  }
  if (meProblem === 'offline')
    return <ProblemMessage offline onRetry={() => window.location.reload()} />
  if (meProblem) return <ProblemMessage onRetry={() => window.location.reload()} />
  if (!allowed) {
    return (
      <StatusMessage
        icon={<ShieldCheck />}
        title={m.perm_no_access_title()}
        action={
          <Button variant="outline" asChild>
            <Link to="/trips">{m.perm_no_access_back()}</Link>
          </Button>
        }
      >
        {m.perm_no_access_body()}
      </StatusMessage>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">{m.perm_title()}</h1>
          <p className="text-muted-foreground text-sm">
            {readOnly ? m.perm_readonly_note() : m.perm_tagline()}
          </p>
        </div>
        {search.tab === 'roles' && !readOnly && (
          <Button onClick={() => setOpen('role:')} className="hidden md:inline-flex">
            <Plus />
            {m.perm_role_new()}
          </Button>
        )}
      </div>

      <Tabs
        value={search.tab}
        onValueChange={(value) =>
          isTab(value) && setFilters({ tab: value, q: '', open: '', dir: 'asc' })
        }
      >
        <TabsList aria-label={m.perm_tabs_label()} className="md:max-w-md">
          {PERMISSION_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {TAB_LABELS[tab]()}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={search.tab} className="mt-4 flex flex-col gap-4">
          <PermissionsToolbar
            tab={search.tab}
            query={queryInput.draft}
            onQueryChange={queryInput.setDraft}
            onQueryClear={queryInput.clear}
            dir={search.dir}
            onDirChange={(dir) => setFilters({ dir })}
          />

          {search.tab === 'roles' && !readOnly && (
            <Button onClick={() => setOpen('role:')} className="h-11 md:hidden">
              <Plus />
              {m.perm_role_new()}
            </Button>
          )}
          {search.tab === 'users' &&
            !readOnly &&
            typedSub !== '' &&
            !users.items.includes(typedSub) && (
              <Button
                variant="outline"
                onClick={() => setOpen(`user:${typedSub}`)}
                className="h-11 md:h-9"
              >
                {m.perm_user_manage_typed({ sub: typedSub })}
              </Button>
            )}

          {list.isPending ? (
            <ListSkeleton />
          ) : list.problem === 'offline' ? (
            <ProblemMessage offline onRetry={list.refetch} />
          ) : list.problem ? (
            <ProblemMessage onRetry={list.refetch} />
          ) : list.total === 0 ? (
            hasFilter && list.hasAny ? (
              <StatusMessage
                icon={<SearchX />}
                title={m.perm_no_match_title()}
                action={
                  <Button variant="outline" onClick={reset}>
                    {m.perm_search_clear()}
                  </Button>
                }
              >
                {m.perm_no_match_body()}
              </StatusMessage>
            ) : (
              <EmptyTab tab={search.tab} />
            )
          ) : (
            <>
              {search.tab === 'roles' && (
                <RolesList roles={roles.items} onOpen={(name) => setOpen(`role:${name}`)} />
              )}
              {search.tab === 'users' && (
                <UsersList subs={users.items} onOpen={(sub) => setOpen(`user:${sub}`)} />
              )}
              {search.tab === 'audit' && <AuditList entries={audit.items} />}
              <PaginationBar
                page={Math.min(search.page, Math.max(list.pages, 1))}
                pages={list.pages}
                size={search.size}
                total={list.total}
                onPageChange={setPage}
                onSizeChange={setSize}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      <ResponsiveModal
        open={
          open?.kind === 'role' && !confirmingDelete && (open.id === '' || editedRole !== undefined)
        }
        onOpenChange={(next) => !next && closeModal()}
        isDesktop={isDesktop}
        title={
          editedRole ? m.perm_role_title_edit({ name: editedRole.name }) : m.perm_role_title_new()
        }
        description={
          editedRole
            ? editedRole.name === 'superadmin'
              ? m.perm_role_description_locked()
              : m.perm_role_description_edit()
            : m.perm_role_description_new()
        }
      >
        {roleLoading ? (
          <ListSkeleton />
        ) : (
          <RoleForm
            key={editedRole?.name ?? 'new'}
            role={editedRole ?? null}
            rows={rows}
            readOnly={readOnly}
            isSaving={actions.isBusy}
            error={error}
            onSave={(name, description, grants) =>
              run(
                editedRole
                  ? actions.updateRole(editedRole.name, description, grants)
                  : actions.createRole(name, description, grants),
                closeModal,
              )
            }
            onDelete={() => setConfirmingDelete(true)}
            onClose={closeModal}
          />
        )}
      </ResponsiveModal>

      <ResponsiveModal
        open={confirmingDelete && editedRole !== undefined}
        onOpenChange={(next) => !next && setConfirmingDelete(false)}
        isDesktop={isDesktop}
        title={m.perm_role_delete_confirm_title({ name: editedRole?.name ?? '' })}
        description={m.perm_role_delete_confirm_body()}
      >
        <DeleteRoleConfirm
          isDeleting={actions.isBusy}
          error={error}
          onConfirm={() => editedRole && run(actions.deleteRole(editedRole.name), closeModal)}
          onCancel={() => setConfirmingDelete(false)}
        />
      </ResponsiveModal>

      <ResponsiveModal
        open={open?.kind === 'user' && open.id !== ''}
        onOpenChange={(next) => !next && closeModal()}
        isDesktop={isDesktop}
        title={m.perm_user_title()}
        description={m.perm_user_description()}
      >
        {open?.kind === 'user' && (
          <UserPanel
            user={openedUser.user}
            isLoading={openedUser.isPending || roleLoading}
            failed={openedUser.problem !== null}
            roles={allRoles.roles}
            rows={rows}
            readOnly={readOnly}
            isBusy={actions.isBusy}
            error={error}
            onAssign={(role) => void run(actions.assignRole(open.id, role))}
            onRevoke={(role) => void run(actions.revokeRole(open.id, role))}
            onGrant={(feature, level) =>
              void run(
                level === 'NONE'
                  ? actions.revokeGrant(open.id, feature)
                  : actions.setGrant(open.id, feature, level),
              )
            }
            onClose={closeModal}
          />
        )}
      </ResponsiveModal>
    </div>
  )
}

function ProblemMessage({ offline = false, onRetry }: { offline?: boolean; onRetry: () => void }) {
  return (
    <StatusMessage
      role="alert"
      icon={offline ? <CloudOff /> : <TriangleAlert />}
      title={offline ? m.perm_offline_title() : m.perm_load_failed_title()}
      action={
        <Button variant="outline" onClick={onRetry}>
          {m.action_retry()}
        </Button>
      }
    >
      {offline ? m.perm_offline_body() : m.perm_load_failed_body()}
    </StatusMessage>
  )
}

function EmptyTab({ tab }: { tab: PermissionTab }) {
  const copy = {
    roles: { title: m.perm_roles_empty_title(), body: m.perm_roles_empty_body() },
    users: { title: m.perm_users_empty_title(), body: m.perm_users_empty_body() },
    audit: { title: m.perm_audit_empty_title(), body: m.perm_audit_empty_body() },
  }[tab]
  return (
    <StatusMessage icon={<ShieldCheck />} title={copy.title}>
      {copy.body}
    </StatusMessage>
  )
}
