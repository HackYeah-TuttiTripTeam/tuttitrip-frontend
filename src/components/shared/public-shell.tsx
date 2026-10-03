import type { ReactNode } from 'react'
import type { SessionStatus } from '@/hooks/use-session'
import { m } from '@/paraglide/messages'
import type { LanguageState } from './language-menu'
import { PublicHeader } from './public-header'
import { SiteFooter } from './site-footer'
import { type ThemeState, ThemeToggle } from './theme-toggle'

export interface PublicShellProps {
  /** Guests get login and sign-up, signed-in users a link to their trips. */
  status: SessionStatus
  language: LanguageState
  theme: ThemeState
  /** Deployment name; shown as a badge everywhere except production. */
  envLabel: string | null
  onLogin: () => void
  onSignup: () => void
  children: ReactNode
}

/** Layout of the pages a guest can open: the header with the way in, content, the full footer. */
export function PublicShell({
  status,
  language,
  theme,
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

      <PublicHeader
        status={status}
        language={language}
        extras={<ThemeToggle state={theme} />}
        envLabel={envLabel}
        onLogin={onLogin}
        onSignup={onSignup}
      />

      <main id="main" className="flex-1">
        {children}
      </main>

      <SiteFooter language={language} extras={<ThemeToggle state={theme} />} />
    </div>
  )
}
