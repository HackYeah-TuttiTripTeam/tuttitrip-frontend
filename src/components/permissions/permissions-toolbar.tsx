import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search, X } from '@keyline-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SortDirection } from '@/loaders/list-search'
import type { PermissionTab } from '@/loaders/permissions'
import { m } from '@/paraglide/messages'

interface PermissionsToolbarProps {
  tab: PermissionTab
  query: string
  onQueryChange: (query: string) => void
  onQueryClear: () => void
  dir: SortDirection
  onDirChange: (dir: SortDirection) => void
}

const PLACEHOLDERS: Record<PermissionTab, () => string> = {
  roles: () => m.perm_search_roles(),
  users: () => m.perm_search_users(),
  audit: () => m.perm_search_audit(),
}

/** The audit lists newest first by default, so there "ascending" means the API's order. */
function sortLabel(tab: PermissionTab, dir: SortDirection): string {
  if (tab === 'audit') return dir === 'asc' ? m.perm_sort_newest() : m.perm_sort_oldest()
  return dir === 'asc' ? m.perm_sort_az() : m.perm_sort_za()
}

export function PermissionsToolbar({
  tab,
  query,
  onQueryChange,
  onQueryClear,
  dir,
  onDirChange,
}: PermissionsToolbarProps) {
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
          placeholder={PLACEHOLDERS[tab]()}
          aria-label={PLACEHOLDERS[tab]()}
          className="h-11 pr-10 pl-9 sm:h-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onQueryClear}
            aria-label={m.perm_search_clear()}
            className="-translate-y-1/2 absolute top-1/2 right-1 sm:size-8"
          >
            <X />
          </Button>
        )}
      </div>
      <Button
        variant="outline"
        onClick={() => onDirChange(ascending ? 'desc' : 'asc')}
        className="h-11 sm:h-9"
      >
        {ascending ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
        {sortLabel(tab, dir)}
      </Button>
    </search>
  )
}
