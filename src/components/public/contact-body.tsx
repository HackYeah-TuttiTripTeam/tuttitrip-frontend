import { ArrowUpRight } from '@keyline-icons/react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { EXTERNAL_LINK, GITHUB_ORG_URL } from '@/lib/links'
import { m } from '@/paraglide/messages'
import { ctaClass, Section, textLinkClass } from './section'

export function ContactBody() {
  return (
    <Section className="flex flex-col items-start gap-5 py-10 md:py-20">
      <h1 className="font-extrabold text-4xl leading-[1.05] tracking-tight md:text-5xl">
        {m.contact_title()}
      </h1>
      <p className="max-w-prose text-lg text-muted-foreground leading-relaxed">
        {m.contact_lede()}
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
        <Button asChild className={ctaClass}>
          <a href={GITHUB_ORG_URL} {...EXTERNAL_LINK}>
            {m.contact_github()}
            <ArrowUpRight aria-hidden="true" />
            <span className="sr-only">({m.external_link_new_tab()})</span>
          </a>
        </Button>
        <Link to="/about" className={textLinkClass}>
          {m.contact_about()}
        </Link>
      </div>
    </Section>
  )
}
