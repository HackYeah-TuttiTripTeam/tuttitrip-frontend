// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { tripsListKey, tripsQueryOptions } from '@/api/queries/trips'
import { useCreateTrip } from '@/hooks/use-create-trip'
import { useDeleteTrip } from '@/hooks/use-delete-trip'
import { tripsSearchSchema } from '@/loaders/trips'
import { TRIP_ID } from '@/mocks/fixtures'

/** Two cached pages of the list, as the paged view leaves them. */
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const keys = [{}, { page: 2, q: 'x' }].map(
    (input) => tripsQueryOptions(tripsSearchSchema.parse(input)).queryKey,
  )
  for (const key of keys)
    client.setQueryData(key, { items: [], total: 0, page: 1, size: 20, pages: 0 })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const invalidated = () => keys.map((key) => client.getQueryState(key)?.isInvalidated)
  return { wrapper, invalidated }
}

describe('trips list invalidation', () => {
  it('the list key is a prefix of every page', () => {
    const key = tripsQueryOptions(tripsSearchSchema.parse({ page: 3 })).queryKey
    expect(key.slice(0, tripsListKey.length)).toEqual([...tripsListKey])
  })

  it('invalidates every cached page after a create', async () => {
    const { wrapper, invalidated } = setup()
    const { result } = renderHook(() => useCreateTrip(), { wrapper })
    await act(() => result.current.mutateAsync({ body: { name: 'Gdańsk' } }))
    await waitFor(() => expect(invalidated()).toEqual([true, true]))
  })

  it('invalidates every cached page after a delete', async () => {
    const { wrapper, invalidated } = setup()
    const { result } = renderHook(() => useDeleteTrip(() => undefined), { wrapper })
    await act(() => result.current.mutateAsync({ params: { path: { trip_id: TRIP_ID } } }))
    await waitFor(() => expect(invalidated()).toEqual([true, true]))
  })
})
