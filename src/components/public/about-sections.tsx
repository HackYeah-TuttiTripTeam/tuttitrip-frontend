import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { RouteSteps } from './route-steps'
import { ctaClass, Section, textLinkClass } from './section'

export function AboutIntro() {
  return (
    <Section className="grid gap-8 py-10 md:grid-cols-2 md:gap-16 md:py-20">
      <div className="flex flex-col gap-5">
        <h1 className="text-balance font-extrabold text-4xl leading-[1.05] tracking-tight md:text-5xl">
          {m.about_title()}
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground leading-relaxed">
          {m.about_lede()}
        </p>
      </div>
      <div className="flex flex-col gap-6 md:pt-3">
        <h2 className="font-bold text-2xl tracking-tight">{m.about_split_title()}</h2>
        <RouteSteps
          steps={[
            { title: m.about_split_1_title(), body: m.about_split_1_body() },
            { title: m.about_split_2_title(), body: m.about_split_2_body() },
            { title: m.about_split_3_title(), body: m.about_split_3_body() },
          ]}
        />
      </div>
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
    <Section className="py-8 md:py-12">
      <h2 className="font-bold text-2xl tracking-tight md:text-3xl">{m.about_inside_title()}</h2>
      <dl className="mt-6 border-b">
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

const TEAM_DOTS = ['bg-member-1', 'bg-member-2', 'bg-member-3', 'bg-member-4', 'bg-member-5']

export function AboutTeam({ onSignup }: { onSignup?: () => void }) {
  return (
    <Section className="flex flex-col items-start gap-5 py-10 md:py-16">
      <div aria-hidden="true" className="flex gap-2">
        {TEAM_DOTS.map((tone) => (
          <span key={tone} className={cn('size-4 rounded-full', tone)} />
        ))}
      </div>
      <h2 className="font-extrabold text-3xl tracking-tight md:text-4xl">{m.about_team_title()}</h2>
      <p className="max-w-prose text-lg text-muted-foreground leading-relaxed">
        {m.about_team_body()}
      </p>
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
