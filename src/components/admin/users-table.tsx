import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Bin,
  MoreHorizontal,
  Unlock,
} from '@keyline-icons/react'
import {
  createColumnHelper,
  functionalUpdate,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import type { AdminUser } from '@/api/queries/admin-users'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { providerOf } from '@/lib/account'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { UserSortKey } from '@/loaders/admin-users'
import type { SortDirection } from '@/loaders/list-search'
import { m } from '@/paraglide/messages'
import { PROVIDER_LABELS, USER_SORT_LABELS } from './user-labels'

const features = tableFeatures({ rowSortingFeature })
const column = createColumnHelper<typeof features, AdminUser>()

const isSortKey = (id: string): id is UserSortKey => id in USER_SORT_LABELS

const columnClass: Record<string, string> = {
  email: 'w-full md:w-2/5',
  provider: 'hidden md:table-cell',
  created_at: 'hidden md:table-cell',
  last_login: 'hidden lg:table-cell',
  blocked: 'text-right md:text-left',
  actions: 'w-12 text-right',
}

interface UsersTableProps {
  users: AdminUser[]
  sort: UserSortKey
  dir: SortDirection
  onSortChange: (sort: UserSortKey, dir: SortDirection) => void
  /** Whether the caller may block and delete (WRITE on admin.users); READ only lists. */
  canWrite: boolean
  /** The caller's own `sub` (from `GET /me`): their row offers no block or delete. */
  mySub: string | undefined
  busy: boolean
  onBlock: (user: AdminUser) => void
  onUnblock: (user: AdminUser) => void
  onDelete: (user: AdminUser) => void
}

const label = (user: AdminUser) => user.email ?? user.name ?? user.sub

/** Rows arrive sorted by the server; the table only renders and toggles the sort state. */
export function UsersTable({
  users,
  sort,
  dir,
  onSortChange,
  canWrite,
  mySub,
  busy,
  onBlock,
  onUnblock,
  onDelete,
}: UsersTableProps) {
  const sorting: SortingState = [{ id: sort, desc: dir === 'desc' }]

  const columns = column.columns([
    column.accessor('email', {
      header: () => USER_SORT_LABELS.email(),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{label(row.original)}</p>
          {row.original.email && row.original.name && (
            <p className="truncate text-muted-foreground">{row.original.name}</p>
          )}
        </div>
      ),
    }),
    column.accessor('provider', {
      header: () => m.admin_users_col_provider(),
      enableSorting: false,
      cell: ({ row }) => PROVIDER_LABELS[providerOf(row.original.provider ?? row.original.sub)](),
    }),
    column.accessor('created_at', {
      header: () => USER_SORT_LABELS.created_at(),
      sortDescFirst: true,
      cell: ({ getValue }) => <DateCell iso={getValue()} />,
    }),
    column.accessor('last_login', {
      header: () => USER_SORT_LABELS.last_login(),
      sortDescFirst: true,
      cell: ({ getValue }) => <DateCell iso={getValue()} />,
    }),
    column.accessor('blocked', {
      header: () => m.admin_users_col_status(),
      enableSorting: false,
      cell: ({ getValue }) =>
        getValue() ? (
          <span className="rounded-full border border-destructive px-2.5 py-0.5 font-medium text-destructive text-xs">
            {m.admin_users_status_blocked()}
          </span>
        ) : (
          <span className="rounded-full border px-2.5 py-0.5 text-xs">
            {m.admin_users_status_active()}
          </span>
        ),
    }),
    column.display({
      id: 'actions',
      header: () => <span className="sr-only">{m.admin_users_col_actions()}</span>,
      cell: ({ row }) =>
        canWrite &&
        row.original.sub !== mySub && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={busy}
                aria-label={m.admin_users_actions_label({ name: label(row.original) })}
                className="size-11 rounded-full text-muted-foreground md:size-9"
              >
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {row.original.blocked ? (
                <DropdownMenuItem onSelect={() => onUnblock(row.original)}>
                  <Unlock />
                  {m.admin_users_action_unblock()}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => onBlock(row.original)}>
                  <Ban />
                  {m.admin_users_action_block()}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(row.original)}>
                <Bin />
                {m.admin_users_action_delete()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
    }),
  ])

  const table = useTable({
    features,
    columns,
    data: users,
    getRowId: (user) => user.sub,
    manualSorting: true,
    enableSortingRemoval: false,
    state: { sorting },
    onSortingChange: (updater) => {
      const [next] = functionalUpdate(updater, sorting)
      if (next && isSortKey(next.id)) onSortChange(next.id, next.desc ? 'desc' : 'asc')
    },
  })

  return (
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
                    sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                  }
                >
                  {sortable ? (
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
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={cn('max-w-0 px-2 py-3', columnClass[cell.column.id])}
              >
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function DateCell({ iso }: { iso: string | null | undefined }) {
  return iso ? (
    <time dateTime={iso} className="whitespace-nowrap text-muted-foreground tabular-nums">
      {formatDate(iso)}
    </time>
  ) : (
    <span className="text-muted-foreground">{m.admin_users_never()}</span>
  )
}

export function UsersTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col">
      <Skeleton className="mb-3 h-4 w-32" />
      {Array.from({ length: rows }, (_, index) => `skeleton-${index}`).map((key) => (
        <div key={key} className="flex items-center gap-4 border-t py-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
