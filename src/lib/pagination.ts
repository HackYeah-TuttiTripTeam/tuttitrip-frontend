export const PAGE_SIZES = [10, 20, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 20

export type PageItem = number | 'gap'

/** Page numbers to show: first, last, the current one and its neighbours, "gap" for the rest. */
export function pageItems(page: number, pages: number): PageItem[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1])
  const numbers = [...wanted].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  const items: PageItem[] = []
  let previous = 0
  for (const n of numbers) {
    if (n - previous === 2) items.push(previous + 1)
    else if (n - previous > 2) items.push('gap')
    items.push(n)
    previous = n
  }
  return items
}
