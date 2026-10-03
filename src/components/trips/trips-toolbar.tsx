import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search, X } from '@keyline-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { m } from '@/paraglide/messages'
import { type SortDirection, TRIP_SORT_LABELS, type TripSortKey } from './trip-columns'

interface TripsToolbarProps {
  query: string
  onQueryChange: (query: string) => void
  sort: TripSortKey
  dir: SortDirection
  onSortChange: (sort: TripSortKey, dir: SortDirection) => void
}

const isSortKey = (value: string): value is TripSortKey => value in TRIP_SORT_LABELS

export function TripsToolbar({ query, onQueryChange, sort, dir, onSortChange }: TripsToolbarProps) {
  const ascending = dir === 'asc'

  return (
    <search className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground"
        />
        <Input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={m.trips_search_placeholder()}
          aria-label={m.trips_search_label()}
          className="h-11 pr-10 pl-9 sm:h-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onQueryChange('')}
            aria-label={m.trips_no_match_clear()}
            className="-translate-y-1/2 absolute top-1/2 right-1 sm:size-8"
          >
            <X />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={sort}
          onValueChange={(value) => isSortKey(value) && onSortChange(value, dir)}
        >
          <SelectTrigger
            aria-label={m.trips_sort_by()}
            className="h-11 flex-1 sm:h-9 sm:w-44 sm:flex-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TRIP_SORT_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onSortChange(sort, ascending ? 'desc' : 'asc')}
          aria-label={ascending ? m.trips_sort_ascending() : m.trips_sort_descending()}
          className="size-11 sm:size-9"
        >
          {ascending ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
        </Button>
      </div>
    </search>
  )
}
