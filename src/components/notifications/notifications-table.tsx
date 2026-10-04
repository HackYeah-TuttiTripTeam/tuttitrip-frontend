import { ArrowDown, ArrowUp, ArrowUpDown } from '@keyline-icons/react'
import {
  createColumnHelper,
  functionalUpdate,
  type RowSelectionState,
  rowSelectionFeature,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { createContext, useContext } from 'react'
import type { Notification } from '@/api/queries/notifications'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, formatRelative, formatTime } from '@/lib/format'
import {
  describeNotification,
  NOTIFICATION_SORT_KEYS,
  type NotificationSortKey,
  notificationTypeLabel,
} from '@/lib/notification-copy'
import { cn } from '@/lib/utils'
import type { SortDirection } from '@/loaders/list-search'
import { m } from '@/paraglide/messages'
import { NotificationIcon } from './notification-icon'

const features = tableFeatures({ rowSortingFeature, rowSelectionFeature })
const column = createColumnHelper<typeof features, Notification>()

/**
 * What the cells need and the row data does not carry. It travels in a React context so the column
 * definitions stay the same object between renders: new columns would remount the cells, and a
 * checkbox the user just clicked would be replaced under their finger.
 */
interface CellEnvironment {
  tripName: (id: string | null) => string | null
  onOpen: (notification: Notification) => void
}
const CellEnv = createContext<CellEnvironment>({ tripName: () => null, onOpen: () => undefined })

const SORT_KEYS: readonly string[] = NOTIFICATION_SORT_KEYS
const isSortKey = (id: string): id is NotificationSortKey => SORT_KEYS.includes(id)

const columns = column.columns([
  column.display({
    id: 'select',
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        aria-label={m.notif_select_page()}
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : false
        }
        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked === true)}
        className="size-5 md:size-4"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={m.notif_select_row({
          title: describeNotification(row.original).title,
        })}
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked === true)}
        className="size-5 md:size-4"
      />
    ),
  }),
  column.accessor('type', {
    id: 'content',
    enableSorting: false,
    header: () => m.notif_column_content(),
    cell: ({ row }) => <ContentCell notification={row.original} />,
  }),
  column.accessor('type', {
    id: 'type',
    header: () => m.notif_column_type(),
    cell: ({ getValue }) => <span className="text-sm">{notificationTypeLabel(getValue())}</span>,
  }),
  column.accessor('trip_id', {
    id: 'trip',
    enableSorting: false,
    header: () => m.notif_column_trip(),
    cell: ({ getValue }) => <TripCell id={getValue()} />,
  }),
  column.accessor('created_at', {
    id: 'created_at',
    sortDescFirst: true,
    header: () => m.notif_column_date(),
    cell: ({ getValue }) => (
      <time
        dateTime={getValue()}
        title={`${formatDate(getValue())}, ${formatTime(getValue())}`}
        className="whitespace-nowrap text-muted-foreground tabular-nums"
      >
        {formatDate(getValue())}
        <span className="block text-xs">{formatTime(getValue())}</span>
      </time>
    ),
  }),
])

function ContentCell({ notification }: { notification: Notification }) {
  const { tripName, onOpen } = useContext(CellEnv)
  const { title, body, icon } = describeNotification(notification)
  const unread = notification.read_at === null
  const trip = tripName(notification.trip_id)
  return (
    <div className="flex min-w-0 items-start gap-3">
      <NotificationIcon name={icon} className="hidden sm:flex" />
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpen(notification)}
          className={cn(
            'block max-w-full truncate rounded-md text-left outline-none after:absolute after:inset-0 focus-visible:ring-[3px] focus-visible:ring-ring/50',
            unread ? 'font-semibold' : 'font-medium',
          )}
        >
          {unread && <span className="sr-only">{m.notif_unread()}: </span>}
          {title}
        </button>
        {body && <p className="truncate text-muted-foreground">{body}</p>}
        {/* On phones the type, trip and date columns are hidden, so they ride under the text. */}
        <p className="truncate text-muted-foreground text-xs md:hidden">
          {[notificationTypeLabel(notification.type), trip, formatRelative(notification.created_at)]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      {unread && (
        <span aria-hidden="true" className="mt-2 ml-auto size-2 shrink-0 rounded-full bg-primary" />
      )}
    </div>
  )
}

function TripCell({ id }: { id: string | null }) {
  const name = useContext(CellEnv).tripName(id)
  return name ? (
    <span className="block truncate">{name}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  )
}

const columnClass: Record<string, string> = {
  select: 'w-12 px-3',
  content: 'w-full',
  type: 'hidden whitespace-nowrap md:table-cell md:w-36',
  trip: 'hidden md:table-cell md:w-44 md:max-w-44',
  created_at: 'hidden whitespace-nowrap md:table-cell md:w-32',
}

interface NotificationsTableProps {
  notifications: Notification[]
  sort: NotificationSortKey
  dir: SortDirection
  onSortChange: (sort: NotificationSortKey, dir: SortDirection) => void
  rowSelection: RowSelectionState
  onRowSelectionChange: (selection: RowSelectionState) => void
  tripName: CellEnvironment['tripName']
  onOpen: CellEnvironment['onOpen']
}

/** Rows arrive sorted and paged by the server; the table renders them, selects and toggles sort. */
export function NotificationsTable({
  notifications,
  sort,
  dir,
  onSortChange,
  rowSelection,
  onRowSelectionChange,
  tripName,
  onOpen,
}: NotificationsTableProps) {
  const sorting: SortingState = [{ id: sort, desc: dir === 'desc' }]

  const table = useTable({
    features,
    columns,
    data: notifications,
    getRowId: (notification) => notification.id,
    manualSorting: true,
    enableSortingRemoval: false,
    enableRowSelection: true,
    state: { sorting, rowSelection },
    onSortingChange: (updater) => {
      const [next] = functionalUpdate(updater, sorting)
      if (next && isSortKey(next.id)) onSortChange(next.id, next.desc ? 'desc' : 'asc')
    },
    onRowSelectionChange: (updater) =>
      onRowSelectionChange(functionalUpdate(updater, rowSelection)),
  })

  return (
    <CellEnv.Provider value={{ tripName, onOpen }}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => {
                const sortable = header.column.getCanSort()
                const sorted = header.column.getIsSorted()
                const SortIcon =
                  sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown
                return (
                  <TableHead
                    key={header.id}
                    className={cn('h-11 px-0 md:h-10', columnClass[header.column.id])}
                    aria-sort={
                      sortable
                        ? sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : 'none'
                        : undefined
                    }
                  >
                    {header.column.id === 'select' ? (
                      <table.FlexRender header={header} />
                    ) : sortable ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          'inline-flex h-11 items-center gap-1.5 rounded-md px-2 font-medium text-xs outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 md:h-10',
                          sorted ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        <table.FlexRender header={header} />
                        <SortIcon
                          aria-hidden="true"
                          className={cn('size-3.5', sorted ? 'text-primary' : 'opacity-40')}
                        />
                      </button>
                    ) : (
                      <span className="px-2 font-medium text-muted-foreground text-xs">
                        <table.FlexRender header={header} />
                      </span>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className="relative"
              data-state={row.getIsSelected() && 'selected'}
            >
              {row.getAllCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    'px-2 py-3',
                    cell.column.id === 'content' && 'max-w-0',
                    columnClass[cell.column.id],
                    // Above the row-wide click target of the title, so the checkbox stays clickable.
                    cell.column.id === 'select' && 'relative z-10',
                  )}
                >
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CellEnv.Provider>
  )
}

export function NotificationsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col">
      <Skeleton className="mb-3 h-4 w-32" />
      {Array.from({ length: rows }, (_, index) => `skeleton-${index}`).map((key) => (
        <div key={key} className="flex items-center gap-4 border-t py-4">
          <Skeleton className="size-5" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
