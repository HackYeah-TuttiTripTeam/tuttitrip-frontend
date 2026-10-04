import { ArrowDownWideNarrow, ArrowUpNarrowWide } from '@keyline-icons/react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { m } from '@/paraglide/messages'

interface SortControlsProps<Key extends string> {
  sort: Key
  dir: 'asc' | 'desc'
  /** Label per sort key; the order of the entries is the order of the menu. */
  labels: Record<Key, () => string>
  onChange: (sort: Key, dir: 'asc' | 'desc') => void
}

/** A sort key menu plus an ascending/descending button, for lists whose sort lives in the URL. */
export function SortControls<Key extends string>({
  sort,
  dir,
  labels,
  onChange,
}: SortControlsProps<Key>) {
  const ascending = dir === 'asc'
  const keys = Object.keys(labels) as Key[]
  return (
    <div className="flex items-center gap-2">
      <Select
        value={sort}
        onValueChange={(value) => {
          const next = keys.find((key) => key === value)
          if (next) onChange(next, dir)
        }}
      >
        <SelectTrigger
          aria-label={m.trips_sort_by()}
          className="h-11 flex-1 sm:h-9 sm:w-44 sm:flex-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {keys.map((key) => (
            <SelectItem key={key} value={key}>
              {labels[key]()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(sort, ascending ? 'desc' : 'asc')}
        aria-label={ascending ? m.trips_sort_ascending() : m.trips_sort_descending()}
        className="size-11 sm:size-9"
      >
        {ascending ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
      </Button>
    </div>
  )
}
