import { cn } from 'cn'
import type * as React from 'react'
import { Button } from '@/components/ui/button'

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  )
}

function PaginationItem(props: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />
}

/** A page button: 44 px on touch, 36 px with a pointer. */
function PaginationLink({
  isActive,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { isActive?: boolean }) {
  return (
    <Button
      data-slot="pagination-link"
      aria-current={isActive ? 'page' : undefined}
      variant={isActive ? 'default' : 'ghost'}
      className={cn('size-11 tabular-nums md:size-9', className)}
      {...props}
    />
  )
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      className={cn('flex size-9 items-center justify-center text-muted-foreground', className)}
      {...props}
    >
      …
    </span>
  )
}

export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink }
