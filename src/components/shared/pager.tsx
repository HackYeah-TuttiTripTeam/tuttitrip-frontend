import { ChevronLeft, ChevronRight } from '@keyline-icons/react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface PagerProps {
  page: number
  pages: number
  onPageChange: (page: number) => void
}

/** Previous, "page X of Y", next: for a list the server cuts into pages. Hidden for one page. */
export function Pager({ page, pages, onPageChange }: PagerProps) {
  if (pages <= 1) return null
  return (
    <nav aria-label={m.pager_label()} className="flex items-center justify-between gap-3">
      <Button
        variant="outline"
        className="h-11 md:h-9"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft aria-hidden="true" />
        {m.pager_previous()}
      </Button>
      <p className="text-muted-foreground text-sm tabular-nums">
        {m.pager_position({ page, pages })}
      </p>
      <Button
        variant="outline"
        className="h-11 md:h-9"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        {m.pager_next()}
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  )
}
