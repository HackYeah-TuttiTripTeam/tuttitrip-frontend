import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleXIcon,
  InfoIcon,
  LoaderCircleIcon,
} from '@keyline-icons/react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

/** Sonner on the app's tokens. The theme comes from the caller: components hold no hooks. */
const Toaster = (props: ToasterProps) => (
  <Sonner
    className="toaster group"
    icons={{
      success: <CircleCheckIcon className="size-4" />,
      info: <InfoIcon className="size-4" />,
      warning: <CircleAlertIcon className="size-4" />,
      error: <CircleXIcon className="size-4" />,
      loading: <LoaderCircleIcon className="size-4 animate-spin" />,
    }}
    style={
      {
        '--normal-bg': 'var(--popover)',
        '--normal-text': 'var(--popover-foreground)',
        '--normal-border': 'var(--border)',
        '--border-radius': 'var(--radius)',
      } as React.CSSProperties
    }
    {...props}
  />
)

export { Toaster }
