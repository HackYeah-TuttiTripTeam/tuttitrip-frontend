import { Question } from '@keyline-icons/react'
import { cn } from 'cn'
import { useSyncExternalStore } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FINE_POINTER_QUERY, HELP_HINTS, type HelpHintId } from '@/lib/help-hints'
import { m } from '@/paraglide/messages'

function useFinePointer(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const media = window.matchMedia(FINE_POINTER_QUERY)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(FINE_POINTER_QUERY).matches,
    () => false,
  )
}

interface HelpHintProps {
  id: HelpHintId
  className?: string
}

/**
 * A "?" button beside a field label that explains the attribute and its role in the system.
 * One surface per device: a precise pointer gets a tooltip on hover and focus, touch gets a
 * popover on tap. The button is 24px with a 44px hit area on coarse pointers. It is a shared
 * primitive for short hints, not a guide: it highlights nothing.
 */
export function HelpHint({ id, className }: HelpHintProps) {
  const fine = useFinePointer()
  const hint = HELP_HINTS[id]
  const title = hint.title()
  const button = (
    <button
      type="button"
      aria-label={m.help_trigger_label({ topic: title })}
      data-slot="help-hint"
      className={cn(
        'relative inline-flex size-6 shrink-0 items-center justify-center rounded-full align-middle text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-expanded:text-foreground pointer-coarse:before:absolute pointer-coarse:before:-inset-2.5 pointer-coarse:before:content-[""]',
        className,
      )}
    >
      <Question aria-hidden="true" className="size-4" />
    </button>
  )
  const content = (
    <>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{hint.body()}</p>
    </>
  )

  if (fine) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent collisionPadding={16}>{content}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  return (
    <Popover>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent collisionPadding={16}>{content}</PopoverContent>
    </Popover>
  )
}
