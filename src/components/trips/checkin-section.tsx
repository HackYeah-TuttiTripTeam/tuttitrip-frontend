import { Bed, Pen, Search, X } from '@keyline-icons/react'
import { useEffect, useState } from 'react'
import type { Checkin } from '@/api/queries/checkins'
import { Pager } from '@/components/shared/pager'
import { SortControls } from '@/components/shared/sort-controls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatAgo } from '@/lib/format'
import { FILTER_DEBOUNCE_MS } from '@/lib/trip-extras'
import { m } from '@/paraglide/messages'

export type CheckinSortKey = 'accommodation' | 'room' | 'updated_at'

const SORT_LABELS: Record<CheckinSortKey, () => string> = {
  accommodation: m.checkin_sort_accommodation,
  room: m.checkin_sort_room,
  updated_at: m.checkin_sort_updated,
}

interface CheckinSectionProps {
  items: Checkin[]
  total: number
  page: number
  pages: number
  sort: CheckinSortKey
  dir: 'asc' | 'desc'
  query: string
  /** True while a new page or filter loads; the old rows stay visible, dimmed. */
  isFetching: boolean
  /** Profile ids the caller may set (themselves; a host also people without an account). */
  editableIds: ReadonlySet<string>
  /** Whether the caller can set any entry at all (shows the main button). */
  canSet: boolean
  onEdit: (profileId: string) => void
  onAdd: () => void
  onRemove: (profileId: string) => void
  onQueryChange: (query: string) => void
  onSortChange: (sort: CheckinSortKey, dir: 'asc' | 'desc') => void
  onPageChange: (page: number) => void
}

/** "Zameldowanie": who stays where and in which room, with the caller's own entry editable. */
export function CheckinSection({
  items,
  total,
  page,
  pages,
  sort,
  dir,
  query,
  isFetching,
  editableIds,
  canSet,
  onEdit,
  onAdd,
  onRemove,
  onQueryChange,
  onSortChange,
  onPageChange,
}: CheckinSectionProps) {
  // The input shows what is typed at once; the URL (and the API call) follows after a pause.
  const [draft, setDraft] = useState(query)
  useEffect(() => setDraft(query), [query])
  useEffect(() => {
    if (draft === query) return
    const timer = window.setTimeout(() => onQueryChange(draft), FILTER_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft, query, onQueryChange])
  const filtered = query !== '' || draft !== ''
  return (
    <section aria-labelledby="checkin-heading" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col">
          <h2 id="checkin-heading" className="font-medium text-lg">
            {m.checkin_title()}
          </h2>
          <p className="text-muted-foreground text-sm">{m.checkin_lead()}</p>
        </div>
        {canSet && (
          <Button onClick={onAdd} className="h-11 shrink-0 md:h-9">
            <Bed aria-hidden="true" />
            {m.checkin_set()}
          </Button>
        )}
      </div>

      {(total > 0 || filtered) && (
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
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={m.checkin_search_placeholder()}
              aria-label={m.checkin_search_label()}
              className="h-11 pr-10 pl-9 sm:h-9 [&::-webkit-search-cancel-button]:hidden"
            />
            {filtered && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDraft('')
                  onQueryChange('')
                }}
                aria-label={m.trips_no_match_clear()}
                className="-translate-y-1/2 absolute top-1/2 right-1 sm:size-8"
              >
                <X />
              </Button>
            )}
          </div>
          <SortControls sort={sort} dir={dir} labels={SORT_LABELS} onChange={onSortChange} />
        </search>
      )}

      {items.length === 0 ? (
        <p className="border-t py-6 text-muted-foreground text-sm">
          {filtered ? m.checkin_no_match() : m.checkin_empty()}
        </p>
      ) : (
        <ul
          aria-label={m.checkin_list_label()}
          aria-busy={isFetching}
          className={`flex flex-col divide-y border-t transition-opacity ${isFetching ? 'opacity-60' : ''}`}
        >
          {items.map((entry) => (
            <li key={entry.profile_id} className="flex items-start gap-3 py-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {entry.display_name}
                  {entry.is_me && (
                    <span className="ml-2 font-normal text-muted-foreground text-sm">
                      {m.checkin_me()}
                    </span>
                  )}
                </span>
                <span className="text-sm leading-[22px]">{entry.accommodation}</span>
                <span className="text-muted-foreground text-sm leading-[22px]">
                  {entry.room ? m.checkin_room_value({ room: entry.room }) : m.checkin_room_none()}
                  {' · '}
                  {m.checkin_updated({ ago: formatAgo(entry.updated_at) })}
                </span>
              </div>
              {editableIds.has(entry.profile_id) && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label={m.checkin_edit_for({ name: entry.display_name })}
                    onClick={() => onEdit(entry.profile_id)}
                  >
                    <Pen />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label={m.checkin_remove_for({ name: entry.display_name })}
                    onClick={() => onRemove(entry.profile_id)}
                  >
                    <X />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Pager page={page} pages={pages} onPageChange={onPageChange} disabled={isFetching} />
    </section>
  )
}

export function CheckinSectionSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}
