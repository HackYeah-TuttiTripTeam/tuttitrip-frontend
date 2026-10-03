import { cn } from 'cn'
import { Tabs as TabsPrimitive } from 'radix-ui'
import type * as React from 'react'

const focusRing = 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-6', className)}
      {...props}
    />
  )
}

/** Segmented control: a pill track with equal columns, 54px tall with its 44px triggers. */
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'grid auto-cols-fr grid-flow-col gap-1 rounded-full border bg-muted p-1',
        className,
      )}
      {...props}
    />
  )
}

/** The active segment is filled with ink (foreground on background). */
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full px-2 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground',
        focusRing,
        'data-[state=active]:bg-foreground data-[state=active]:text-background',
        "[&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

/** Panels are focusable (tabIndex 0 from Radix), so they get the same visible ring as the triggers. */
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('rounded-md', focusRing, className)}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
