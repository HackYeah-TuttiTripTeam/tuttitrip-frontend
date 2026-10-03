import { Link } from '@tanstack/react-router'
import type { CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { PhotoCredit } from './photo-credit'
import { Picture } from './picture'
import { ProofList } from './proof-list'
import { Reveal } from './reveal'
import { RouteSteps } from './route-steps'
import { ctaClass, Section, textLinkClass } from './section'

export function AboutIntro() {
  return (
    <Section className="grid items-center gap-8 py-10 md:grid-cols-[1.15fr_0.85fr] md:gap-16 md:py-20">
      <div className="flex flex-col gap-5">
        <h1 className="hero-rise text-balance font-extrabold text-4xl leading-[1.05] tracking-tight md:text-5xl">
          {m.about_title()}
        </h1>
        <p
          className="hero-rise max-w-prose text-lg text-muted-foreground leading-relaxed"
          style={{ '--rise-delay': '80ms' } as CSSProperties}
        >
          {m.about_lede()}
        </p>
      </div>
      <figure
        className="hero-rise flex flex-col gap-2"
        style={{ '--rise-delay': '140ms' } as CSSProperties}
      >
        <div className="overflow-hidden rounded-lg border">
          <Picture
            id="rodzina"
            alt={m.photo_rodzina_alt()}
            sizes="(min-width: 768px) 38vw, 100vw"
            priority
            className="aspect-[16/10] object-cover object-[50%_60%] md:aspect-[4/5]"
          />
        </div>
        <figcaption>
          <PhotoCredit id="rodzina" />
        </figcaption>
      </figure>
    </Section>
  )
}

export function AboutSplit() {
  return (
    <Section className="py-8 md:py-12">
      <Reveal>
        <h2 className="mb-8 font-bold text-2xl tracking-tight md:text-3xl">
          {m.about_split_title()}
        </h2>
      </Reveal>
      <RouteSteps
        spread
        steps={[
          { title: m.about_split_1_title(), body: m.about_split_1_body() },
          { title: m.about_split_2_title(), body: m.about_split_2_body() },
          { title: m.about_split_3_title(), body: m.about_split_3_body() },
        ]}
      />
    </Section>
  )
}

export function AboutInside() {
  const rows = [
    { title: m.about_inside_plan_title(), body: m.about_inside_plan_body() },
    { title: m.about_inside_check_title(), body: m.about_inside_check_body() },
    { title: m.about_inside_expenses_title(), body: m.about_inside_expenses_body() },
  ]
  return (
    <Section id="inside" className="scroll-mt-24 py-8 md:py-12">
      <Reveal>
        <h2 className="font-bold text-2xl tracking-tight md:text-3xl">{m.about_inside_title()}</h2>
      </Reveal>
      <Reveal delay={80}>
        <ProofList rows={rows} />
      </Reveal>
    </Section>
  )
}

const MEMBERS = [
  { name: () => m.team_member_1(), tone: 'bg-member-1' },
  { name: () => m.team_member_2(), tone: 'bg-member-2' },
  { name: () => m.team_member_3(), tone: 'bg-member-3' },
  { name: () => m.team_member_4(), tone: 'bg-member-4' },
  { name: () => m.team_member_5(), tone: 'bg-member-5' },
] as const

/** "Ł", "G" of "Łukasz Gęborys" for the avatar: first letters of the first two words. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function AboutTeam({ onSignup }: { onSignup?: () => void }) {
  return (
    <Section className="flex flex-col items-start gap-6 py-10 md:py-16">
      <Reveal className="flex max-w-2xl flex-col gap-3">
        <h2 className="font-extrabold text-3xl tracking-tight md:text-4xl">
          {m.about_team_title()}
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">{m.about_team_body()}</p>
      </Reveal>
      <Reveal className="w-full" delay={80}>
        <ul
          aria-label={m.about_team_list()}
          className="grid w-full gap-x-6 gap-y-3 rounded-lg border bg-card p-4 sm:grid-cols-2 md:grid-cols-3 md:p-5"
        >
          {MEMBERS.map((member) => {
            const name = member.name()
            return (
              <li key={name} className="flex min-h-11 items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-full font-bold font-heading text-on-member text-sm',
                    member.tone,
                  )}
                >
                  {initials(name)}
                </span>
                <span className="font-semibold">{name}</span>
              </li>
            )
          })}
        </ul>
      </Reveal>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
        {onSignup && (
          <Button onClick={onSignup} className={ctaClass}>
            {m.account_signup()}
          </Button>
        )}
        <Link to="/contact" className={textLinkClass}>
          {m.nav_contact()}
        </Link>
      </div>
    </Section>
  )
}
