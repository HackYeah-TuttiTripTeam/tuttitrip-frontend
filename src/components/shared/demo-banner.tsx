import { Link } from '@tanstack/react-router'
import { m } from '@/paraglide/messages'

/**
 * Persistent notice on the shared jury account: what is shared, when it resets, and the way to
 * ask for an account of your own. Sits at the top of the sticky header on every app page.
 */
export function DemoBanner() {
  return (
    <aside
      aria-label={m.demo_banner_label()}
      className="border-b bg-secondary text-secondary-foreground"
    >
      <p className="mx-auto flex max-w-5xl flex-col px-4 py-1.5 text-sm leading-snug sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 md:px-6">
        {m.demo_banner_text()}{' '}
        <Link
          to="/contact"
          className="inline-block py-1.5 font-medium underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {m.demo_banner_admin_link()}
        </Link>
      </p>
    </aside>
  )
}
