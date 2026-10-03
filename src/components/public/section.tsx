import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Big pill button used for the one primary action of a public section. */
export const ctaClass = 'h-11 rounded-full px-6 text-base'

/** Quiet text link next to a primary action. */
export const textLinkClass =
  'inline-flex min-h-11 items-center gap-1 rounded-md font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50'

/** Section width shared by every public page. */
export function Section({
  children,
  id,
  className,
}: {
  children: ReactNode
  id?: string
  className?: string
}) {
  return (
    <section id={id} className={cn('mx-auto w-full max-w-5xl px-4 md:px-6', className)}>
      {children}
    </section>
  )
}
