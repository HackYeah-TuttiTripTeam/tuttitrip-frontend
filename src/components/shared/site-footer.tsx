import { ArrowUpRight } from '@keyline-icons/react'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { EXTERNAL_LINK, GITHUB_ORG_URL } from '@/lib/links'
import { UNSPLASH_LICENSE_URL } from '@/lib/photos'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { BrandLogo } from './brand-mark'
import { LanguageMenu, type LanguageState } from './language-menu'

const linkClass =
  'inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-muted-foreground text-sm underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 [&.active]:text-foreground'

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={linkClass} {...EXTERNAL_LINK}>
      {children}
      <ArrowUpRight aria-hidden="true" className="size-4" />
      <span className="sr-only">({m.external_link_new_tab()})</span>
    </a>
  )
}

interface SiteFooterProps {
  language: LanguageState
  /** Extra controls next to the language switch (e.g. the theme toggle). */
  extras?: ReactNode
  /**
   * "full" on the public pages: logo, description and link columns. "compact" in the app
   * after sign-in: one row with the same links.
   */
  variant?: 'full' | 'compact'
  className?: string
}

/** Footer of the public pages (full) and of the app shell (compact). */
export function SiteFooter({ language, extras, variant = 'full', className }: SiteFooterProps) {
  const year = new Date().getFullYear()
  const legal = (
    <p className="text-muted-foreground text-sm">
      {m.footer_copyright({ year })} · {m.footer_hackyeah()}
    </p>
  )
  const controls = (
    <div className="-mr-2 flex items-center gap-1">
      <LanguageMenu language={language} side="top" />
      {extras}
    </div>
  )

  if (variant === 'compact') {
    return (
      <footer className={cn('border-t', className)}>
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          <nav aria-label={m.shell_nav_footer()} className="-mx-1 flex flex-wrap gap-x-3">
            <Link to="/about" className={linkClass}>
              {m.nav_about()}
            </Link>
            <Link to="/contact" className={linkClass}>
              {m.nav_contact()}
            </Link>
            <Link to="/prywatnosc" className={linkClass}>
              {m.nav_privacy()}
            </Link>
            <External href={GITHUB_ORG_URL}>{m.footer_github()}</External>
          </nav>
          <div className="flex items-center justify-between gap-4 md:justify-end">
            {legal}
            {controls}
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className={cn('border-t', className)}>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-6 md:py-14">
        <div className="flex flex-col items-start gap-4">
          <Link
            to="/"
            className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <BrandLogo className="h-9" />
          </Link>
          <p className="max-w-xs text-muted-foreground text-sm leading-relaxed">
            {m.footer_description()}
          </p>
        </div>

        <nav aria-label={m.shell_nav_footer()} className="contents">
          <FooterColumn title={m.footer_product()}>
            <Link to="/" hash="how" activeOptions={{ includeHash: true }} className={linkClass}>
              {m.nav_product_how()}
            </Link>
            <Link
              to="/"
              hash="fairness"
              activeOptions={{ includeHash: true }}
              className={linkClass}
            >
              {m.nav_product_fairness()}
            </Link>
            <Link
              to="/about"
              hash="inside"
              activeOptions={{ includeHash: true }}
              className={linkClass}
            >
              {m.nav_product_inside()}
            </Link>
          </FooterColumn>
          <FooterColumn title={m.footer_team()}>
            <Link to="/about" className={linkClass}>
              {m.nav_about()}
            </Link>
            <Link to="/contact" className={linkClass}>
              {m.nav_contact()}
            </Link>
            <External href={GITHUB_ORG_URL}>{m.footer_github()}</External>
          </FooterColumn>
          <FooterColumn title={m.footer_licences()}>
            <Link to="/prywatnosc" className={linkClass}>
              {m.nav_privacy()}
            </Link>
            <External href={UNSPLASH_LICENSE_URL}>{m.footer_unsplash_licence()}</External>
          </FooterColumn>
        </nav>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2 md:px-6">
          {legal}
          {controls}
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start">
      <p className="mb-1 px-1 font-semibold text-sm">{title}</p>
      {children}
    </div>
  )
}
