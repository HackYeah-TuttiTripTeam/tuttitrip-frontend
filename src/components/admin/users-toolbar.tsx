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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { UserSortKey } from '@/loaders/admin-users'
import type { SortDirection } from '@/loaders/list-search'
import { m } from '@/paraglide/messages'
import { USER_SORT_LABELS } from './user-labels'

type BlockedFilter = 'all' | 'active' | 'blocked'

const toFilter = (blocked: boolean | undefined): BlockedFilter =>
  blocked === undefined ? 'all' : blocked ? 'blocked' : 'active'
const fromFilter = (value: string): boolean | undefined =>
  value === 'blocked' ? true : value === 'active' ? false : undefined
const isSortKey = (value: string): value is UserSortKey => value in USER_SORT_LABELS

interface UsersToolbarProps {
  /** The text box, already debounced by the caller. */
  query: string
  onQueryChange: (query: string) => void
  onQueryClear: () => void
  blocked: boolean | undefined
  onBlockedChange: (blocked: boolean | undefined) => void
  sort: UserSortKey
  dir: SortDirection
  onSortChange: (sort: UserSortKey, dir: SortDirection) => void
  hasFilters: boolean
  onReset: () => void
}

export function UsersToolbar({
  query,
  onQueryChange,
  onQueryClear,
  blocked,
  onBlockedChange,
  sort,
  dir,
  onSortChange,
  hasFilters,
  onReset,
}: UsersToolbarProps) {
  const ascending = dir === 'asc'
  return (
    <search className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
            placeholder={m.admin_users_search_placeholder()}
            aria-label={m.admin_users_search_label()}
            className="h-11 pr-10 pl-9 sm:h-9 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onQueryClear}
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
              className="h-11 flex-1 sm:h-9 sm:w-48 sm:flex-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(USER_SORT_LABELS).map(([key, label]) => (
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
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          aria-label={m.admin_users_filter_status()}
          value={toFilter(blocked)}
          onValueChange={(value) => value && onBlockedChange(fromFilter(value))}
          className="auto-cols-auto"
        >
          <ToggleGroupItem value="all" className="h-11 sm:h-8">
            {m.admin_users_filter_all()}
          </ToggleGroupItem>
          <ToggleGroupItem value="active" className="h-11 sm:h-8">
            {m.admin_users_status_active()}
          </ToggleGroupItem>
          <ToggleGroupItem value="blocked" className="h-11 sm:h-8">
            {m.admin_users_status_blocked()}
          </ToggleGroupItem>
        </ToggleGroup>
        {hasFilters && (
          <Button variant="ghost" onClick={onReset} className="h-11 sm:h-9">
            <X />
            {m.trips_filters_clear()}
          </Button>
        )}
      </div>
    </search>
  )
}
