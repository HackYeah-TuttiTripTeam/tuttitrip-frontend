import { ArrowUpRight } from '@keyline-icons/react'
import { Link } from '@tanstack/react-router'
import type { CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { EXTERNAL_LINK, GITHUB_ORG_URL } from '@/lib/links'
import { PHOTOS } from '@/lib/photos'
import { m } from '@/paraglide/messages'
import { Picture } from './picture'
import { Reveal } from './reveal'
import { ctaClass, Section, textLinkClass } from './section'

export function ContactBody() {
  const { width, height } = PHOTOS.zespol
  return (
    <Section className="grid items-center gap-10 py-10 md:grid-cols-[1fr_1.1fr] md:gap-16 md:py-20">
      <div className="flex flex-col items-start gap-5">
        <h1 className="hero-rise font-extrabold text-4xl leading-[1.05] tracking-tight md:text-5xl">
          {m.contact_title()}
        </h1>
        <p
          className="hero-rise max-w-prose text-lg text-muted-foreground leading-relaxed"
          style={{ '--rise-delay': '80ms' } as CSSProperties}
        >
          {m.contact_lede()}
        </p>
        <div
          className="hero-rise flex flex-wrap items-center gap-x-6 gap-y-2 pt-1"
          style={{ '--rise-delay': '160ms' } as CSSProperties}
        >
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
      </div>

      <Reveal as="figure" className="flex flex-col gap-3" delay={100}>
        <div
          className="overflow-hidden rounded-lg border"
          style={{ aspectRatio: `${width} / ${height}` }}
        >
          <Picture id="zespol" alt={m.contact_photo_alt()} sizes="(min-width: 768px) 50vw, 100vw" />
        </div>
        <figcaption className="flex flex-col gap-0.5">
          <span className="font-bold font-heading text-lg tracking-tight">
            {m.contact_team_title()}
          </span>
          <span className="text-muted-foreground text-sm">{m.contact_team_body()}</span>
        </figcaption>
      </Reveal>
    </Section>
  )
}
