import { keepPreviousData } from '@tanstack/react-query'

/** The API's page envelope; `pages` is 0 when empty. */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

/** Paged list queries keep the previous page on screen while the next one loads. */
export const pagedQueryOptions = <O extends object>(options: O) => ({
  ...options,
  placeholderData: keepPreviousData,
})
