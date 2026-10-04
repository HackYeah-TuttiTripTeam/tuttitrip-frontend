import { Bell, CloudOff, KeyRound, SearchX, TriangleAlert } from '@keyline-icons/react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useRouter } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { notificationFilter, notificationQueryOptions } from '@/api/queries/notifications'
import { NotificationDialog } from '@/components/notifications/notification-dialog'
import { NotificationSelectionBar } from '@/components/notifications/notification-selection-bar'
import {
  NotificationsTable,
  NotificationsTableSkeleton,
} from '@/components/notifications/notifications-table'
import { NotificationsToolbar } from '@/components/notifications/notifications-toolbar'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { useKeyedSelection } from '@/hooks/use-keyed-selection'
import { useClampPage, useListSearch } from '@/hooks/use-list-search'
import { useMarkNotifications } from '@/hooks/use-mark-notifications'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useNotificationActions } from '@/hooks/use-notification-actions'
import { useNotifications } from '@/hooks/use-notifications'
import { useSession } from '@/hooks/use-session'
import { useTripOptions } from '@/hooks/use-trip-options'
import { isDev } from '@/lib/env'
import { hasNotificationFilters, notificationFilterDefaults } from '@/loaders/notifications'
import { m } from '@/paraglide/messages'

const route = getRouteApi('/notifications')

export function NotificationsView() {
  const session = useSession()
  const { search, setPage, setSize, setSort, setFilters, reset } = useListSearch(route, {
    filterDefaults: notificationFilterDefaults,
  })
  const { notifications, total, pages, isPending, isPlaceholder, problem, refetch } =
    useNotifications(search, session.status)
  useClampPage(search.page, pages, setPage)
  const { trips, tripName } = useTripOptions(session.status)
  const actions = useNotificationActions()
  const mark = useMarkNotifications()
  // Opening the dialog does not touch the selection: `open` is not part of what the list shows.
  const selection = useKeyedSelection(JSON.stringify({ ...search, open: undefined }))
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  // The dialog's notification: from the loaded page when it is there, else asked for by id.
  const openId = search.open
  const onPage = notifications.find((item) => item.id === openId)
  const single = useQuery({
    ...notificationQueryOptions(openId ?? ''),
    enabled: Boolean(openId) && !onPage && !isPending && session.status !== 'loading',
    retry: false,
  })
  const opened = onPage ?? single.data ?? null
  const lookingUp = Boolean(openId) && !opened && (isPending || single.isPending)
  const navigate = route.useNavigate()
  // Opened from a row on this page: that was a history entry of its own, so closing steps back
  // over it and Back needs one press. A link, a reload or an open from the bell/toast is replaced.
  const router = useRouter()
  const openedHere = useRef(false)
  useEffect(() => {
    if (!openId) openedHere.current = false
  }, [openId])
  const setOpen = (id: string | undefined) => {
    if (id === undefined && openedHere.current) {
      openedHere.current = false
      router.history.back()
      return
    }
    openedHere.current = id !== undefined
    void navigate({ search: (prev) => ({ ...prev, open: id }), replace: id === undefined })
  }

  // Opening reads it, once: marking it unread again from the dialog must stick.
  const autoRead = useRef(new Set<string>())
  const { mutate: markRead } = mark
  useEffect(() => {
    if (!opened || opened.read_at !== null || autoRead.current.has(opened.id)) return
    autoRead.current.add(opened.id)
    markRead(
      { body: { read: true, ids: [opened.id] } },
      // Failed: allow another try the next time it is opened.
      { onError: () => autoRead.current.delete(opened.id) },
    )
  }, [opened, markRead])

  const hasFilters = hasNotificationFilters(search)
  const needsLogin = session.status === 'anonymous' || problem === 'unauthorized'
  // A page past the end is replaced by the last one (useClampPage): skeleton until that lands.
  const pastTheEnd = pages !== undefined && pages > 0 && search.page > pages
  const showList =
    !needsLogin && !problem && !isPending && !pastTheEnd && session.status !== 'loading'

  const markSelected = (read: boolean) => {
    const body = selection.allMatching
      ? { read, filters: notificationFilter(search) }
      : { read, ids: selection.ids }
    mark.mutate(
      { body },
      {
        onSuccess: ({ updated }) => {
          selection.clear()
          toast.success(
            read
              ? m.notif_marked_read({ count: updated })
              : m.notif_marked_unread({ count: updated }),
          )
        },
        onError: () => toast.error(m.notif_mark_failed()),
      },
    )
  }

  return (
    <div
      className={
        selection.ids.length > 0 ? 'flex flex-col gap-6 pb-44 md:pb-0' : 'flex flex-col gap-6'
      }
    >
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
          {m.notif_page_title()}
        </h1>
        <p className="text-muted-foreground text-sm">
          {showList && total > 0 ? m.notif_count({ count: total }) : m.notif_page_tagline()}
        </p>
      </div>

      {showList && (total > 0 || hasFilters) && (
        <NotificationsToolbar
          sort={search.sort}
          dir={search.dir}
          onSortChange={setSort}
          filters={search}
          onFiltersChange={setFilters}
          trips={trips}
          hasFilters={hasFilters}
          onReset={reset}
        />
      )}

      {session.status === 'loading' || isPending || pastTheEnd ? (
        <NotificationsTableSkeleton />
      ) : session.error && session.status === 'anonymous' ? (
        <StatusMessage
          role="alert"
          icon={<TriangleAlert />}
          title={m.trips_login_failed_title()}
          action={<Button onClick={session.login}>{m.action_retry()}</Button>}
        >
          {session.error}
        </StatusMessage>
      ) : needsLogin ? (
        <StatusMessage
          icon={<KeyRound />}
          title={m.notif_login_required_title()}
          action={
            session.status === 'disabled' ? undefined : (
              <Button onClick={session.login}>{m.account_login()}</Button>
            )
          }
        >
          {session.status !== 'disabled'
            ? m.notif_login_required_body()
            : isDev
              ? m.trips_login_required_auth_disabled_dev()
              : m.trips_login_required_auth_disabled()}
        </StatusMessage>
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
          title={m.notif_load_failed_title()}
          action={
            <Button variant="outline" onClick={refetch}>
              {m.action_retry()}
            </Button>
          }
        >
          {m.notif_load_failed()}
        </StatusMessage>
      ) : total === 0 && !hasFilters ? (
        <StatusMessage icon={<Bell />} title={m.notif_empty_title()}>
          {m.notif_empty_body()}
        </StatusMessage>
      ) : total === 0 ? (
        <StatusMessage
          icon={<SearchX />}
          title={m.notif_no_match_title()}
          action={
            <Button variant="outline" onClick={reset}>
              {m.notif_filters_clear()}
            </Button>
          }
        >
          {m.notif_no_match_body()}
        </StatusMessage>
      ) : (
        <div
          aria-busy={isPlaceholder}
          className={isPlaceholder ? 'opacity-60 transition-opacity' : undefined}
        >
          <NotificationsTable
            notifications={notifications}
            sort={search.sort}
            dir={search.dir}
            onSortChange={setSort}
            rowSelection={selection.rows}
            onRowSelectionChange={selection.setRows}
            tripName={tripName}
            onOpen={(notification) => setOpen(notification.id)}
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

      <NotificationDialog
        open={Boolean(openId) && !lookingUp}
        notification={opened}
        isDesktop={isDesktop}
        tripName={tripName(opened?.trip_id ?? null)}
        onClose={() => setOpen(undefined)}
        onAction={actions.run}
        onToggleRead={(notification) =>
          mark.mutate({ body: { read: notification.read_at === null, ids: [notification.id] } })
        }
      />

      <NotificationSelectionBar
        selected={selection.ids.length}
        pageSize={notifications.length}
        total={total}
        allMatching={selection.allMatching}
        busy={mark.isPending}
        onSelectAllMatching={selection.selectAllMatching}
        onClear={selection.clear}
        onMark={markSelected}
      />
    </div>
  )
}
