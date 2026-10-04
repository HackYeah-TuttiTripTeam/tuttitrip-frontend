import { CloudOff } from '@keyline-icons/react'
import { m } from '@/paraglide/messages'

/**
 * Shown above the header while the browser is offline. The app shell still works from the
 * service worker cache (production only), but nothing new loads or saves until the network is back.
 */
export function OfflineBanner() {
  return (
    <div role="status" className="border-b bg-muted text-foreground">
      <p className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-1.5 text-xs leading-snug md:px-6 md:text-sm">
        <CloudOff aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        {m.shell_offline_text()}
      </p>
    </div>
  )
}
