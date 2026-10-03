import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'
import { BrandMark } from './brand-mark'
import { LanguageMenu, type LanguageState } from './language-menu'
import { SiteFooter } from './site-footer'

export interface PublicShellProps {
  /** "guest": offer login and sign-up; "member": link to the trips; "none": nothing to offer yet. */
  visitor: 'guest' | 'member' | 'none'
  language: LanguageState
  /** Deployment name; shown as a badge everywhere except production. */
  envLabel: string | null
  onLogin: () => void
  onSignup: () => void
  children: ReactNode
}

const navLinkClass =
  'hidden h-11 items-center rounded-md px-2 text-muted-foreground text-sm outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 md:flex [&.active]:text-foreground [&.active]:underline [&.active]:decoration-primary [&.active]:decoration-2 [&.active]:underline-offset-8'

/** Layout of the pages a guest can open: a light header with the way in, content, footer. */
export function PublicShell({
  visitor,
  language,
  envLabel,
  onLogin,
  onSignup,
  children,
}: PublicShellProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {m.shell_skip_to_content()}
      </a>

      <header className="sticky top-0 z-40 border-b bg-background pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 md:gap-4 md:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md font-heading font-extrabold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <BrandMark />
            TuttiTrip
          </Link>
          {envLabel && (
            <span className="rounded-full border px-2 py-0.5 font-mono text-muted-foreground text-xs">
              {envLabel}
            </span>
          )}

          <nav aria-label={m.shell_nav_public()} className="ml-4 flex gap-1">
            <Link to="/about" className={navLinkClass}>
              {m.nav_about()}
            </Link>
            <Link to="/contact" className={navLinkClass}>
              {m.nav_contact()}
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-1 md:gap-2">
            <LanguageMenu language={language} />
            {visitor === 'guest' && (
              <>
                <Button
                  variant="outline"
                  onClick={onLogin}
                  className="h-11 rounded-full px-5 md:h-10"
                >
                  {m.account_login()}
                </Button>
                <Button onClick={onSignup} className="hidden h-10 rounded-full px-5 md:inline-flex">
                  {m.account_signup()}
                </Button>
              </>
            )}
            {visitor === 'member' && (
              <Button asChild className="h-11 rounded-full px-5 md:h-10">
                <Link to="/trips">{m.nav_trips()}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <SiteFooter />
    </div>
  )
}
