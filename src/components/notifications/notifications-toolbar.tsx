import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, X } from '@keyline-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  NOTIFICATION_READ_FILTERS,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPES,
  type NotificationReadFilter,
  type NotificationSortKey,
  type NotificationType,
} from '@/lib/notification-copy'
import type { SortDirection } from '@/loaders/list-search'
import { m } from '@/paraglide/messages'

export interface NotificationFilters {
  read: NotificationReadFilter
  type: NotificationType[]
  trip?: string | undefined
  from?: string | undefined
  to?: string | undefined
}

const READ_LABELS: Record<NotificationReadFilter, () => string> = {
  all: m.notif_filter_all,
  unread: m.notif_filter_unread,
  read: m.notif_filter_read,
}
const SORT_LABELS: Record<NotificationSortKey, () => string> = {
  created_at: m.notif_column_date,
  type: m.notif_column_type,
}

const ALL = 'all'
const isReadFilter = (value: string): value is NotificationReadFilter =>
  NOTIFICATION_READ_FILTERS.some((filter) => filter === value)
const isSortKey = (value: string): value is NotificationSortKey => value in SORT_LABELS

interface NotificationsToolbarProps {
  sort: NotificationSortKey
  dir: SortDirection
  onSortChange: (sort: NotificationSortKey, dir: SortDirection) => void
  filters: NotificationFilters
  onFiltersChange: (patch: Partial<NotificationFilters>) => void
  trips: { id: string; name: string }[]
  hasFilters: boolean
  onReset: () => void
}

export function NotificationsToolbar({
  sort,
  dir,
  onSortChange,
  filters,
  onFiltersChange,
  trips,
  hasFilters,
  onReset,
}: NotificationsToolbarProps) {
  const ascending = dir === 'asc'
  const toggleType = (type: NotificationType, on: boolean) =>
    onFiltersChange({
      type: on ? [...filters.type, type] : filters.type.filter((current) => current !== type),
    })

  return (
    <search className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ToggleGroup
          type="single"
          aria-label={m.notif_filter_read_label()}
          value={filters.read}
          // Radix reports "" when the pressed segment is pressed again: keep the choice.
          onValueChange={(value) => isReadFilter(value) && onFiltersChange({ read: value })}
        >
          {NOTIFICATION_READ_FILTERS.map((value) => (
            <ToggleGroupItem key={value} value={value} className="h-11 sm:h-8">
              {READ_LABELS[value]()}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex items-center gap-2">
          <Select
            value={sort}
            onValueChange={(value) => isSortKey(value) && onSortChange(value, dir)}
          >
            <SelectTrigger
              aria-label={m.notif_sort_by()}
              className="h-11 flex-1 sm:h-9 sm:w-40 sm:flex-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_LABELS).map(([key, label]) => (
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
            aria-label={ascending ? m.notif_sort_ascending() : m.notif_sort_descending()}
            className="size-11 sm:size-9"
          >
            {ascending ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-11 sm:h-9">
              {filters.type.length > 0
                ? m.notif_filter_type_count({ count: filters.type.length })
                : m.notif_filter_type_all()}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {NOTIFICATION_TYPES.map((type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={filters.type.includes(type)}
                // Keep the menu open: several types are picked in one go.
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(on) => toggleType(type, on === true)}
                className="min-h-11 md:min-h-8"
              >
                {NOTIFICATION_TYPE_LABELS[type]()}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {trips.length > 0 && (
          <Select
            value={filters.trip ?? ALL}
            onValueChange={(value) => onFiltersChange({ trip: value === ALL ? undefined : value })}
          >
            <SelectTrigger aria-label={m.notif_filter_trip()} className="h-11 w-48 sm:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{m.notif_filter_trip_all()}</SelectItem>
              {trips.map((trip) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {trip.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="notifications-from" className="text-muted-foreground text-xs">
              {m.notif_filter_from()}
            </Label>
            <Input
              id="notifications-from"
              type="date"
              value={filters.from ?? ''}
              max={filters.to}
              onChange={(event) => onFiltersChange({ from: event.target.value || undefined })}
              className="h-11 w-40 sm:h-9"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="notifications-to" className="text-muted-foreground text-xs">
              {m.notif_filter_to()}
            </Label>
            <Input
              id="notifications-to"
              type="date"
              value={filters.to ?? ''}
              min={filters.from}
              onChange={(event) => onFiltersChange({ to: event.target.value || undefined })}
              className="h-11 w-40 sm:h-9"
            />
          </div>
        </div>

        {hasFilters && (
          <Button variant="ghost" onClick={onReset} className="h-11 sm:h-9">
            <X />
            {m.notif_filters_clear()}
          </Button>
        )}
      </div>
    </search>
  )
}
