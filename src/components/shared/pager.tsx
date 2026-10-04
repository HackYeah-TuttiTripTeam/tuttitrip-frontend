import { ChevronLeft, ChevronRight } from '@keyline-icons/react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface PagerProps {
  /** 1-based current page. */
  page: number
  /** Pages in total; the pager is hidden for one page or none. */
  pages: number
  onPageChange: (page: number) => void
  /** True while another page loads (the old rows stay on screen). */
  disabled?: boolean
}

/** Previous, "page X of Y", next: for a list the server cuts into pages. Hidden for one page. */
export function Pager({ page, pages, onPageChange, disabled = false }: PagerProps) {
  if (pages <= 1) return null
  return (
    <nav aria-label={m.pager_label()} className="flex items-center justify-between gap-3">
      <Button
        variant="outline"
        className="h-11 md:h-9"
        disabled={disabled || page <= 1}
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
        disabled={disabled || page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        {m.pager_next()}
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  )
}
