import { ArrowUpRight } from '@keyline-icons/react'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { EXTERNAL_LINK, GITHUB_ORG_URL, ISSUES_URL } from '@/lib/links'
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
  className?: string
}

/** Footer of the public pages and of the app shell: logo, description, link columns, language. */
export function SiteFooter({ language, extras, className }: SiteFooterProps) {
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

  return (
    <footer className={cn('border-t', className)}>
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 md:grid-cols-4 md:px-6 md:py-14 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
        <div className="col-span-2 flex flex-col items-start gap-4 md:col-span-4 lg:col-span-1">
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
            <External href={GITHUB_ORG_URL}>{m.footer_github()}</External>
          </FooterColumn>
          <FooterColumn title={m.footer_licences()}>
            <Link to="/prywatnosc" className={linkClass}>
              {m.nav_privacy()}
            </Link>
            <External href={UNSPLASH_LICENSE_URL}>{m.footer_unsplash_licence()}</External>
          </FooterColumn>
          <FooterColumn title={m.footer_contact()}>
            <Link to="/contact" className={linkClass}>
              {m.nav_contact()}
            </Link>
            <External href={ISSUES_URL}>{m.footer_report_issue()}</External>
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
