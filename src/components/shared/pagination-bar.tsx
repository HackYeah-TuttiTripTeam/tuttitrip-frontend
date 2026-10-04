import { ChevronLeft, ChevronRight } from '@keyline-icons/react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAGE_SIZES, pageItems } from '@/lib/pagination'
import { m } from '@/paraglide/messages'

interface PaginationBarProps {
  page: number
  pages: number
  size: number
  total: number
  /** The next page is loading: buttons wait so clicks cannot pile up. */
  busy?: boolean
  onPageChange: (page: number) => void
  onSizeChange: (size: number) => void
}

/** "21 to 40 of 134", page numbers (a short "page 2 of 7" on phones) and the page size. */
export function PaginationBar({
  page,
  pages,
  size,
  total,
  busy = false,
  onPageChange,
  onSizeChange,
}: PaginationBarProps) {
  const sizeLabelId = useId()
  const from = (page - 1) * size + 1
  const to = Math.min(page * size, total)

  return (
    <div
      data-slot="pagination-bar"
      className="sticky bottom-[calc(4rem+1px+env(safe-area-inset-bottom))] z-10 mt-auto flex flex-col items-center gap-3 border-t bg-background py-3 md:bottom-0 md:flex-row md:justify-between"
    >
      <p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
        {m.list_range({ from, to, total })}
      </p>

      <Pagination aria-label={m.list_pagination_label()} className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <Button
              variant="ghost"
              disabled={busy || page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label={m.list_previous()}
              className="size-11 md:size-9"
            >
              <ChevronLeft />
            </Button>
          </PaginationItem>
          <PaginationItem className="px-2 text-sm tabular-nums md:hidden">
            {m.list_page_of({ page, pages })}
          </PaginationItem>
          {pageItems(page, pages).map((item, index) =>
            item === 'gap' ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: a gap has no identity of its own
              <PaginationItem key={`gap-${index}`} className="hidden md:block">
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item} className="hidden md:block">
                <PaginationLink
                  isActive={item === page}
                  disabled={busy}
                  onClick={() => onPageChange(item)}
                  aria-label={m.list_go_to_page({ page: item })}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <Button
              variant="ghost"
              disabled={busy || page >= pages}
              onClick={() => onPageChange(page + 1)}
              aria-label={m.list_next()}
              className="size-11 md:size-9"
            >
              <ChevronRight />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <span id={sizeLabelId}>{m.list_per_page()}</span>
        <Select value={String(size)} onValueChange={(value) => onSizeChange(Number(value))}>
          <SelectTrigger aria-labelledby={sizeLabelId} className="h-11 w-20 md:h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
