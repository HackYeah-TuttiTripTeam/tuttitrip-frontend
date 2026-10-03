import type { ExamplePerson } from '@/components/public/fairness-example'
import { ClosingCta, HowItWorks, LandingHero, Proof } from '@/components/public/landing-sections'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useHomeRedirect } from '@/hooks/use-home-redirect'
import { useSession } from '@/hooks/use-session'
import { formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'

const FLOOR = 40

/** Sample scores of five people on one plan; the page labels them as sample data. */
function exampleData(): { floor: number; metric: string; people: ExamplePerson[] } {
  return {
    floor: FLOOR,
    metric: formatNumber(0.87),
    people: [
      { name: m.example_person_1(), score: 81, tone: 4 },
      { name: m.example_person_2(), score: 72, tone: 1 },
      { name: m.example_person_3(), score: 69, tone: 5 },
      { name: m.example_person_4(), score: 64, tone: 2 },
      { name: m.example_person_5(), score: 58, tone: 3 },
    ],
  }
}

/**
 * The landing page for guests. Signed-in users never see it: while the session loads or
 * the redirect to /trips runs, the layout is bare and this view renders only a status line.
 */
export function HomeView() {
  useDocumentTitle()
  const session = useSession()
  const waiting = useHomeRedirect(session.status)

  if (waiting) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="flex min-h-svh items-center justify-center text-muted-foreground text-sm"
      >
        <span className="sr-only">{m.home_loading()}</span>
      </div>
    )
  }

  const onSignup = session.status === 'anonymous' ? session.signup : undefined
  const example = exampleData()

  return (
    <>
      <LandingHero
        onSignup={onSignup}
        example={example}
        formatScore={(score) => formatNumber(score, 0)}
      />
      <HowItWorks />
      <Proof />
      <ClosingCta onSignup={onSignup} />
    </>
  )
}
