import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

const linkClass =
  'inline-flex min-h-11 items-center rounded-md px-1 text-muted-foreground text-sm underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50'

/** Footer shared by the public pages and the app shell: about, contact and who built it. */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('border-t', className)}>
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <nav aria-label={m.shell_nav_footer()} className="-mx-1 flex gap-4">
          <Link to="/about" className={linkClass}>
            {m.nav_about()}
          </Link>
          <Link to="/contact" className={linkClass}>
            {m.nav_contact()}
          </Link>
        </nav>
        <p className="text-muted-foreground text-sm">{m.footer_credit()}</p>
      </div>
    </footer>
  )
}
