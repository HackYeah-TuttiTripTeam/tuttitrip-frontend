// @vitest-environment jsdom
// The list helpers on a real router with a memory history: how the URL, the history and the
// defaults behave. It lives in views/ because hooks/ holds no JSX (rule 3), not even in tests.
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  stripSearchParams,
} from '@tanstack/react-router'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { useClampPage, useListSearch } from '@/hooks/use-list-search'
import { createListSearchSchema, textFilter } from '@/loaders/list-search'

const { schema, defaults } = createListSearchSchema({
  sortKeys: ['created_at', 'name'],
  defaultSort: 'created_at',
  filters: {
    q: textFilter(),
    kind: z.enum(['', 'trip', 'outing']).default('').catch(''),
  },
})
const filterDefaults = { q: '', kind: '' } as const

const rootRoute = createRootRoute()
const listRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/x',
  validateSearch: schema,
  search: { middlewares: [stripSearchParams(defaults)] },
  component: Probe,
})

type ListApi = ReturnType<typeof useListSearch<z.output<typeof schema>>>
let list: ListApi
/** What the "server" reports as the page count; undefined while there is no real answer. */
let serverPages: number | undefined

// The explicit return type breaks the type cycle between the route and its component.
function Probe(): ReactNode {
  list = useListSearch(listRoute, { filterDefaults })
  useClampPage(list.search.page, serverPages, list.setPage)
  return <output data-testid="search">{JSON.stringify(list.search)}</output>
}

function renderList(url: string) {
  const history = createMemoryHistory({ initialEntries: [url] })
  const router = createRouter({ routeTree: rootRoute.addChildren([listRoute]), history })
  render(<RouterProvider router={router} />)
  const href = () => router.state.location.href
  return { router, history, href }
}

async function shown() {
  return JSON.parse((await screen.findByTestId('search')).textContent ?? '{}')
}

afterEach(() => {
  cleanup()
  serverPages = undefined
})

describe('createListSearchSchema', () => {
  it('fills every param with its default', () => {
    expect(defaults).toEqual({
      page: 1,
      size: 20,
      sort: 'created_at',
      dir: 'desc',
      q: '',
      kind: '',
    })
  })

  it('turns garbage into defaults instead of failing', () => {
    expect(schema.parse({ page: 'abc', size: 7, sort: 'evil', dir: 'up', kind: 'x' })).toEqual(
      defaults,
    )
    expect(schema.parse({ page: 0 }).page).toBe(1)
    expect(schema.parse({ page: 2.5 }).page).toBe(1)
  })

  it('reads a numeric text filter as text and caps its length', () => {
    expect(schema.parse({ q: 2026 }).q).toBe('2026')
    expect(schema.parse({ q: 'a'.repeat(150) }).q).toHaveLength(100)
  })
})

describe('useListSearch', () => {
  it('returns the values from the URL, and a reload keeps them', async () => {
    const url = '/x?page=3&size=50&sort=name&dir=asc'
    const { href } = renderList(url)
    expect(await shown()).toMatchObject({ page: 3, size: 50, sort: 'name', dir: 'asc' })
    expect(href()).toBe(url)

    cleanup()
    renderList(href())
    expect(await shown()).toMatchObject({ page: 3, size: 50, sort: 'name', dir: 'asc' })
  })

  it('falls back to defaults for a nonsense URL and drops it from the address', async () => {
    const { href } = renderList('/x?page=abc&size=7&dir=up')
    expect(await shown()).toEqual(defaults)
    await waitFor(() => expect(href()).toBe('/x'))
  })

  it.each([
    ['filter', () => list.setFilters({ kind: 'trip' }), 'kind=trip'],
    ['sort', () => list.setSort('name', 'asc'), 'sort=name&dir=asc'],
    ['size', () => list.setSize(50), 'size=50'],
  ])('a %s change goes back to page 1 without a history entry', async (_, change, query) => {
    const { history, href } = renderList('/x?page=4')
    await shown()
    const entries = history.length

    await act(async () => change())

    await waitFor(() => expect(href()).toBe(`/x?${query}`))
    expect(list.search.page).toBe(1)
    expect(history.length).toBe(entries)
  })

  it('the next page adds a history entry, and Back returns to the previous page', async () => {
    const { history, href } = renderList('/x?page=2')
    await shown()
    const entries = history.length

    await act(async () => list.setPage(list.search.page + 1))

    await waitFor(() => expect(href()).toBe('/x?page=3'))
    expect(history.length).toBe(entries + 1)

    await act(async () => history.back())
    await waitFor(() => expect(href()).toBe('/x?page=2'))
    expect(list.search.page).toBe(2)
  })

  it('keeps defaults out of the URL', async () => {
    const { href } = renderList('/x?sort=name&q=rome')
    await shown()

    await act(async () => list.setSort('created_at', 'desc'))
    await waitFor(() => expect(href()).toBe('/x?q=rome'))

    await act(async () => list.reset())
    await waitFor(() => expect(href()).toBe('/x'))
    expect(list.search).toEqual(defaults)
  })

  it('moves a page past the end to the last page, replacing the entry', async () => {
    serverPages = 3
    const { history, href } = renderList('/x?page=9&sort=name')
    await shown()

    await waitFor(() => expect(href()).toBe('/x?page=3&sort=name'))
    expect(history.length).toBe(1)
  })

  it('leaves the page alone while there is no answer or the list is empty', async () => {
    const { href } = renderList('/x?page=9')
    await shown()
    expect(href()).toBe('/x?page=9')

    cleanup()
    serverPages = 0
    const empty = renderList('/x?page=9')
    await shown()
    expect(empty.href()).toBe('/x?page=9')
  })
})
