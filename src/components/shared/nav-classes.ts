import { cn } from '@/lib/utils'

const focusRing = 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

/** Bottom action bar item on phones: icon above label, 56px tall. */
export const tabClass = cn(
  focusRing,
  'flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-muted-foreground text-xs',
  'transition-colors active:bg-accent [&.active]:text-foreground [&.active_svg]:text-primary',
  "[&_svg:not([class*='size-'])]:size-5",
)

/** Top bar item on desktop. */
export const barItemClass = cn(
  focusRing,
  'flex h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-accent',
)
