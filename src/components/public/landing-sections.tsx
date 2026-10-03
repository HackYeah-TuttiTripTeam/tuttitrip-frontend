import { ArrowRight } from '@keyline-icons/react'
import type { CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'
import { CityStrip } from './city-strip'
import { type ExamplePerson, FairnessExample } from './fairness-example'
import { ProofList } from './proof-list'
import { Reveal } from './reveal'
import { RouteSteps } from './route-steps'
import { ctaClass, Section, textLinkClass } from './section'

interface Cta {
  onSignup: () => void
}

interface HeroProps extends Partial<Cta> {
  example: { people: ExamplePerson[]; floor: number }
  formatShare: (share: number) => string
}

export function LandingHero({ onSignup, example, formatShare }: HeroProps) {
  return (
    <Section className="grid items-center gap-10 py-10 md:grid-cols-[1.1fr_0.9fr] md:gap-14 md:py-20">
      <div className="flex flex-col gap-5 md:gap-6">
        <h1 className="hero-rise text-balance font-extrabold text-4xl leading-[1.05] tracking-tight md:text-6xl">
          {m.home_title()}
        </h1>
        <p
          className="hero-rise max-w-prose text-lg text-muted-foreground leading-relaxed"
          style={{ '--rise-delay': '80ms' } as CSSProperties}
        >
          {m.home_lede()}
        </p>
        <div
          className="hero-rise flex flex-wrap items-center gap-x-6 gap-y-2 pt-1"
          style={{ '--rise-delay': '160ms' } as CSSProperties}
        >
          {onSignup && (
            <Button onClick={onSignup} className={ctaClass}>
              {m.account_signup()}
            </Button>
          )}
          <a href="#how" className={textLinkClass}>
            {m.home_see_how()}
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        </div>
        <p
          className="hero-rise max-w-prose text-muted-foreground text-sm"
          style={{ '--rise-delay': '240ms' } as CSSProperties}
        >
          {m.home_accounts_note()}
        </p>
      </div>
      <div className="hero-rise" style={{ '--rise-delay': '120ms' } as CSSProperties}>
        <FairnessExample people={example.people} floor={example.floor} formatShare={formatShare} />
      </div>
    </Section>
  )
}

export function HowItWorks() {
  return (
    <Section id="how" className="scroll-mt-24 py-10 md:py-14">
      <Reveal>
        <h2 className="mb-8 font-bold text-3xl tracking-tight md:text-4xl">{m.how_title()}</h2>
      </Reveal>
      <RouteSteps
        spread
        steps={[
          { title: m.how_1_title(), body: m.how_1_body() },
          { title: m.how_2_title(), body: m.how_2_body() },
          { title: m.how_3_title(), body: m.how_3_body() },
        ]}
      />
    </Section>
  )
}

export function Proof() {
  const rows = [
    { title: m.proof_visible_title(), body: m.proof_visible_body() },
    { title: m.proof_check_title(), body: m.proof_check_body() },
    { title: m.proof_price_title(), body: m.proof_price_body() },
    { title: m.proof_settle_title(), body: m.proof_settle_body() },
  ]
  return (
    <Section className="py-10 md:py-14">
      <Reveal>
        <h2 className="max-w-2xl text-balance font-bold text-3xl tracking-tight md:text-4xl">
          {m.proof_title()}
        </h2>
      </Reveal>
      <Reveal delay={80}>
        <ProofList rows={rows} />
      </Reveal>
    </Section>
  )
}

export function Cities() {
  const cities = [
    { id: 'warszawa', name: m.city_warszawa(), alt: m.photo_warszawa_alt() },
    { id: 'gdansk', name: m.city_gdansk(), alt: m.photo_gdansk_alt() },
    { id: 'krakow', name: m.city_krakow(), alt: m.photo_krakow_alt() },
    { id: 'berlin', name: m.city_berlin(), alt: m.photo_berlin_alt() },
  ] as const
  return (
    <Section className="py-10 md:py-14">
      <Reveal className="mb-8 flex max-w-2xl flex-col gap-2">
        <h2 className="text-balance font-bold text-3xl tracking-tight md:text-4xl">
          {m.cities_title()}
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">{m.cities_body()}</p>
      </Reveal>
      <Reveal delay={80}>
        <CityStrip cities={[...cities]} />
      </Reveal>
    </Section>
  )
}

export function ClosingCta({ onSignup }: Partial<Cta>) {
  return (
    <Section className="flex flex-col items-start gap-5 py-12 md:py-20">
      <Reveal className="flex flex-col items-start gap-5">
        <h2 className="max-w-2xl text-balance font-extrabold text-3xl tracking-tight md:text-5xl">
          {m.closing_title()}
        </h2>
        {onSignup && (
          <Button onClick={onSignup} className={ctaClass}>
            {m.account_signup()}
          </Button>
        )}
      </Reveal>
    </Section>
  )
}
