import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search, X } from '@keyline-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { m } from '@/paraglide/messages'
import {
  type SortDirection,
  TRIP_KIND_LABELS,
  TRIP_ROLE_LABELS,
  TRIP_SORT_LABELS,
  TRIP_STATUS_LABELS,
  TRIP_WHEN_LABELS,
  type TripKind,
  type TripRole,
  type TripSortKey,
  type TripStatus,
  type TripWhen,
} from './trip-columns'

type Kind = TripKind
type Role = TripRole

export interface TripFilters {
  city?: string | undefined
  kind?: Kind | undefined
  when?: TripWhen | undefined
  status?: TripStatus | undefined
  role: Role[]
  start_from?: string | undefined
  start_to?: string | undefined
}

interface TripsToolbarProps {
  /** The text box, already debounced by the caller. */
  query: string
  onQueryChange: (query: string) => void
  onQueryClear: () => void
  sort: TripSortKey
  dir: SortDirection
  onSortChange: (sort: TripSortKey, dir: SortDirection) => void
  filters: TripFilters
  onFiltersChange: (patch: Partial<TripFilters>) => void
  cities: { slug: string; name: string }[]
  hasFilters: boolean
  onReset: () => void
}

const ALL = 'all'
const isSortKey = (value: string): value is TripSortKey => value in TRIP_SORT_LABELS
const isKind = (value: string): value is Kind => value in TRIP_KIND_LABELS
const isWhen = (value: string): value is TripWhen => value in TRIP_WHEN_LABELS
const isStatus = (value: string): value is TripStatus => value in TRIP_STATUS_LABELS
const isRole = (value: string): value is Role => value in TRIP_ROLE_LABELS

export function TripsToolbar({
  query,
  onQueryChange,
  onQueryClear,
  sort,
  dir,
  onSortChange,
  filters,
  onFiltersChange,
  cities,
  hasFilters,
  onReset,
}: TripsToolbarProps) {
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
            placeholder={m.trips_search_placeholder()}
            aria-label={m.trips_search_label()}
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
      </div>

      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <ToggleGroup
          type="multiple"
          aria-label={m.trips_filter_role()}
          value={filters.role}
          onValueChange={(value) => onFiltersChange({ role: value.filter(isRole) })}
          className="auto-cols-auto"
        >
          {Object.entries(TRIP_ROLE_LABELS).map(([key, label]) => (
            <ToggleGroupItem key={key} value={key} className="h-11 sm:h-8">
              {label()}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Select
          value={filters.kind ?? ALL}
          onValueChange={(value) => onFiltersChange({ kind: isKind(value) ? value : undefined })}
        >
          <SelectTrigger aria-label={m.trips_filter_kind()} className="h-11 w-40 sm:h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{m.trips_filter_kind_all()}</SelectItem>
            {Object.entries(TRIP_KIND_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.when ?? ALL}
          onValueChange={(value) => onFiltersChange({ when: isWhen(value) ? value : undefined })}
        >
          <SelectTrigger aria-label={m.trips_filter_when()} className="h-11 w-44 sm:h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{m.trips_filter_when_all()}</SelectItem>
            {Object.entries(TRIP_WHEN_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? ALL}
          onValueChange={(value) =>
            onFiltersChange({ status: isStatus(value) ? value : undefined })
          }
        >
          <SelectTrigger aria-label={m.trips_filter_status()} className="h-11 w-48 sm:h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{m.trips_filter_status_all()}</SelectItem>
            {Object.entries(TRIP_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {cities.length > 0 && (
          <Select
            value={filters.city ?? ALL}
            onValueChange={(value) => onFiltersChange({ city: value === ALL ? undefined : value })}
          >
            <SelectTrigger aria-label={m.trips_filter_city()} className="h-11 w-44 sm:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{m.trips_filter_city_all()}</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city.slug} value={city.slug}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="trips-start-from" className="text-muted-foreground text-xs">
              {m.trips_filter_start_from()}
            </Label>
            <Input
              id="trips-start-from"
              type="date"
              value={filters.start_from ?? ''}
              max={filters.start_to}
              onChange={(event) => onFiltersChange({ start_from: event.target.value || undefined })}
              className="h-11 w-40 sm:h-9"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="trips-start-to" className="text-muted-foreground text-xs">
              {m.trips_filter_start_to()}
            </Label>
            <Input
              id="trips-start-to"
              type="date"
              value={filters.start_to ?? ''}
              min={filters.start_from}
              onChange={(event) => onFiltersChange({ start_to: event.target.value || undefined })}
              className="h-11 w-40 sm:h-9"
            />
          </div>
        </div>

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
