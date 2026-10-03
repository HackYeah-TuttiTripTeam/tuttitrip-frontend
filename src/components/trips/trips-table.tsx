import { ArrowDown, ArrowUp, ArrowUpDown } from '@keyline-icons/react'
import {
  createColumnHelper,
  functionalUpdate,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { type SortDirection, TRIP_SORT_LABELS, type Trip, type TripSortKey } from './trip-columns'

const features = tableFeatures({ rowSortingFeature })
const column = createColumnHelper<typeof features, Trip>()

const columns = column.columns([
  column.accessor('name', {
    header: () => TRIP_SORT_LABELS.name(),
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{row.original.name}</p>
        {/* On phones the destination column is hidden, so it rides under the name. */}
        <p className="truncate text-muted-foreground md:hidden">
          {row.original.destination ?? m.trip_destination_undecided_long()}
        </p>
      </div>
    ),
  }),
  column.accessor('destination', {
    header: () => TRIP_SORT_LABELS.destination(),
    cell: ({ getValue }) =>
      getValue() ?? <span className="text-muted-foreground">{m.trip_destination_undecided()}</span>,
  }),
  column.accessor('created_at', {
    header: () => TRIP_SORT_LABELS.created_at(),
    sortDescFirst: true,
    cell: ({ getValue }) => (
      <time dateTime={getValue()} className="whitespace-nowrap text-muted-foreground tabular-nums">
        {formatDate(getValue())}
      </time>
    ),
  }),
])

const columnClass: Record<string, string> = {
  name: 'w-full md:w-1/2',
  destination: 'hidden md:table-cell',
  created_at: 'text-right',
}

interface TripsTableProps {
  trips: Trip[]
  sort: TripSortKey
  dir: SortDirection
  onSortChange: (sort: TripSortKey, dir: SortDirection) => void
}

const isSortKey = (id: string): id is TripSortKey => id in TRIP_SORT_LABELS

/** Rows arrive sorted (see useTrips); the table only renders and toggles sort state. */
export function TripsTable({ trips, sort, dir, onSortChange }: TripsTableProps) {
  const sorting: SortingState = [{ id: sort, desc: dir === 'desc' }]

  const table = useTable({
    features,
    columns,
    data: trips,
    getRowId: (trip) => trip.id,
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
                  <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      'inline-flex h-11 items-center gap-1.5 md:h-10 rounded-md px-2 font-medium text-xs outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      sorted ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <table.FlexRender header={header} />
                    <SortIcon
                      aria-hidden="true"
                      className={cn('size-3.5', sorted ? 'text-primary' : 'opacity-40')}
                    />
                  </button>
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

export function TripsTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col">
      <Skeleton className="mb-3 h-4 w-32" />
      {Array.from({ length: rows }, (_, index) => `skeleton-${index}`).map((key) => (
        <div key={key} className="flex items-center gap-4 border-t py-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-32 md:block" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
