import { ArrowRight } from '@keyline-icons/react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'
import { type ExamplePerson, FairnessExample } from './fairness-example'
import { RouteSteps } from './route-steps'

export const ctaClass = 'h-11 rounded-full px-6 text-base'

interface Cta {
  onSignup: () => void
}

/** Section width shared by every public page. */
export function Section({
  children,
  id,
  className = '',
}: {
  children: ReactNode
  id?: string
  className?: string
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-5xl px-4 md:px-6 ${className}`}>
      {children}
    </section>
  )
}

interface HeroProps extends Partial<Cta> {
  example: { people: ExamplePerson[]; floor: number; metric: string }
  formatScore: (score: number) => string
}

export function LandingHero({ onSignup, example, formatScore }: HeroProps) {
  return (
    <Section className="grid items-center gap-10 py-10 md:grid-cols-[1.1fr_0.9fr] md:gap-14 md:py-20">
      <div className="flex flex-col gap-5 md:gap-6">
        <h1 className="text-balance font-extrabold text-4xl leading-[1.05] tracking-tight md:text-6xl">
          {m.home_title()}
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground leading-relaxed">{m.home_lede()}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
          {onSignup && (
            <Button onClick={onSignup} className={ctaClass}>
              {m.account_signup()}
            </Button>
          )}
          <a
            href="#how"
            className="inline-flex min-h-11 items-center gap-1 rounded-md font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {m.home_see_how()}
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        </div>
        <p className="max-w-prose text-muted-foreground text-sm">{m.home_accounts_note()}</p>
      </div>
      <FairnessExample
        people={example.people}
        floor={example.floor}
        metric={example.metric}
        formatScore={formatScore}
      />
    </Section>
  )
}

export function HowItWorks() {
  return (
    <Section id="how" className="scroll-mt-20 py-10 md:py-14">
      <h2 className="mb-8 font-bold text-3xl tracking-tight md:text-4xl">{m.how_title()}</h2>
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
      <h2 className="max-w-2xl text-balance font-bold text-3xl tracking-tight md:text-4xl">
        {m.proof_title()}
      </h2>
      <dl className="mt-8 border-b">
        {rows.map((row) => (
          <div key={row.title} className="grid gap-1 border-t py-5 md:grid-cols-[1fr_2fr] md:gap-8">
            <dt className="font-bold text-xl tracking-tight">{row.title}</dt>
            <dd className="max-w-prose text-muted-foreground leading-relaxed">{row.body}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}

export function ClosingCta({ onSignup }: Partial<Cta>) {
  return (
    <Section className="flex flex-col items-start gap-5 py-12 md:py-20">
      <h2 className="max-w-2xl text-balance font-extrabold text-3xl tracking-tight md:text-5xl">
        {m.closing_title()}
      </h2>
      {onSignup && (
        <Button onClick={onSignup} className={ctaClass}>
          {m.account_signup()}
        </Button>
      )}
    </Section>
  )
}
