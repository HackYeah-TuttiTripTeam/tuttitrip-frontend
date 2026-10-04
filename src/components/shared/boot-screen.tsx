import { m } from '@/paraglide/messages'
import { BrandMark } from './brand-mark'

/**
 * Shown on `/` while the session loads or the redirect to the trips runs: the brand mark and
 * a status line for screen readers, in a landmark of its own so the page is never empty.
 */
export function BootScreen() {
  return (
    <main id="main" className="flex min-h-svh items-center justify-center bg-background">
      <div role="status" className="flex flex-col items-center gap-3 text-muted-foreground">
        <BrandMark className="size-12" />
        <span className="sr-only">{m.home_loading()}</span>
      </div>
    </main>
  )
}
