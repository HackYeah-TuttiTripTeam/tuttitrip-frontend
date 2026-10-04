import { useEffect, useRef } from 'react'
import type { SortDirection } from '@/loaders/list-search'

interface ListParams {
  page: number
  size: number
  sort: string
  dir: SortDirection
}

type Navigate<S> = (options: { search: (prev: S) => S; replace?: boolean }) => Promise<void> | void

/** Any TanStack route API; its typed navigate is narrowed to what lists need. */
interface ListRoute<S> {
  useSearch: () => S
  useNavigate: () => unknown
}

interface Options<S extends ListParams> {
  /** Filter values that mean "no filter"; `reset` puts them back. */
  filterDefaults: Partial<S>
}

/**
 * Reads and writes the list state in the URL. A page change adds a history entry; sort, size and
 * filter changes replace it and go back to page 1.
 */
export function useListSearch<S extends ListParams>(
  route: ListRoute<S>,
  { filterDefaults }: Options<S>,
) {
  const search = route.useSearch()
  // The router types navigate per route and per search shape; lists only use the reducer form.
  const navigate = route.useNavigate() as Navigate<S>

  const setPage = (page: number, replace = false) =>
    void navigate({ search: (prev) => ({ ...prev, page }), replace })
  const change = (patch: Partial<S>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }), replace: true })

  return {
    search,
    setPage,
    setSize: (size: S['size']) => change({ size } as Partial<S>),
    setSort: (sort: S['sort'], dir: SortDirection) => change({ sort, dir } as Partial<S>),
    setFilters: change,
    reset: () => change(filterDefaults),
  }
}

/**
 * A `page` beyond the last one the server reports (a stale link) moves to the last page.
 * Pass `pages` only from a real answer: placeholder data belongs to another page or filter.
 */
export function useClampPage(
  page: number,
  pages: number | undefined,
  setPage: (page: number, replace: boolean) => void,
) {
  const latest = useRef(setPage)
  latest.current = setPage
  useEffect(() => {
    if (pages && page > pages) latest.current(pages, true)
  }, [page, pages])
}
