import { cn } from 'cn'
import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Dialog on desktop, a bottom drawer (vaul) on phones. */
  isDesktop: boolean
  title: string
  description: string
  children: ReactNode
  /**
   * False for a decision that must not be dismissed by accident (Confirm-Destroy): a click outside,
   * Escape, the close button and the drag-down gesture do nothing; only the buttons inside the
   * modal close it.
   */
  dismissible?: boolean
  /** A wide dialog on desktop, for forms laid out in two columns. Phones are unaffected. */
  wide?: boolean
}

export function ResponsiveModal({
  open,
  onOpenChange,
  isDesktop,
  title,
  description,
  children,
  dismissible = true,
  wide = false,
}: ResponsiveModalProps) {
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={dismissible}
          onInteractOutside={dismissible ? undefined : (event) => event.preventDefault()}
          onEscapeKeyDown={dismissible ? undefined : (event) => event.preventDefault()}
          className={cn('flex max-h-[90dvh] flex-col', wide ? 'sm:max-w-3xl' : 'sm:max-w-md')}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {/* Only the body scrolls: the header and the close button stay in view. The side
              padding keeps focus rings of the fields from being clipped. */}
          <div className="-mx-1 min-h-0 overflow-x-hidden overflow-y-auto px-1 py-1">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      repositionInputs={false}
      dismissible={dismissible}
    >
      <DrawerContent>
        <DrawerHeader className="group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
