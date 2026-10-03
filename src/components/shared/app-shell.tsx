import { Map as MapIcon, Plus } from '@keyline-icons/react'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'
import { AccountMenu, type AccountState } from './account-menu'
import { BrandLogo } from './brand-mark'
import { LanguageMenu, type LanguageState } from './language-menu'
import { tabClass } from './nav-classes'
import { SiteFooter } from './site-footer'
import { type ThemeState, ThemeToggle } from './theme-toggle'

interface AppShellProps {
  account: AccountState
  language: LanguageState
  theme: ThemeState
  /** Deployment name; shown as a badge everywhere except production. */
  envLabel: string | null
  onCreateTrip: () => void
  children: ReactNode
}

/**
 * Desktop: one top bar with navigation, the primary action and the account.
 * Mobile: a slim top bar plus a bottom action bar within thumb reach.
 */
export function AppShell({
  account,
  language,
  theme,
  envLabel,
  onCreateTrip,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {m.shell_skip_to_content()}
      </a>

      <header className="sticky top-0 z-40 border-b bg-background pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 md:px-6">
          <Link
            to={account.status === 'authenticated' ? '/trips' : '/'}
            className="flex items-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <BrandLogo />
          </Link>
          {envLabel && (
            <span className="rounded-full border px-2 py-0.5 font-mono text-muted-foreground text-xs">
              {envLabel}
            </span>
          )}

          <nav aria-label={m.shell_nav_main()} className="hidden h-full md:flex">
            <Link
              to="/trips"
              className="flex h-full items-center border-transparent border-b-2 text-muted-foreground text-sm outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:underline [&.active]:border-primary [&.active]:text-foreground"
            >
              {m.nav_trips()}
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-1 md:gap-3">
            <LanguageMenu language={language} />
            <div className={account.status === 'authenticated' ? 'hidden md:block' : undefined}>
              <ThemeToggle state={theme} />
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <Button onClick={onCreateTrip}>
                <Plus />
                {m.action_new_trip()}
              </Button>
              <AccountMenu account={account} variant="bar" />
            </div>
          </div>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-10 md:px-6 md:pt-10 md:pb-12"
      >
        {children}
      </main>

      {/* The bottom action bar is fixed on phones; keep the footer clear of it. */}
      <SiteFooter className="pb-20 md:pb-0" />

      <nav
        aria-label={m.shell_nav_actions()}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-3 items-center px-2">
          <Link to="/trips" className={tabClass}>
            <MapIcon />
            {m.nav_trips()}
          </Link>
          <div className="flex justify-center">
            <Button
              onClick={onCreateTrip}
              size="icon-lg"
              aria-label={m.action_new_trip()}
              className="size-14 rounded-full shadow-lg shadow-primary/25 [&_svg:not([class*='size-'])]:size-6"
            >
              <Plus />
            </Button>
          </div>
          <AccountMenu account={account} variant="tab" theme={theme} />
        </div>
      </nav>
    </div>
  )
}
