import { CloudOff } from '@keyline-icons/react'
import { m } from '@/paraglide/messages'

/**
 * Live region above the header. It stays mounted (empty while online) so screen readers
 * announce the message when the connection drops. The app shell still works from the service
 * worker cache (production only), but nothing new loads or saves until the network is back.
 */
export function OfflineBanner({ offline }: { offline: boolean }) {
  return (
    <div role="status">
      {offline && (
        <p className="border-b bg-muted text-foreground">
          <span className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-1.5 text-sm leading-snug md:px-6">
            <CloudOff aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            {m.shell_offline_text()}
          </span>
        </p>
      )}
    </div>
  )
}
