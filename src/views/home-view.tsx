import type { ExamplePerson } from '@/components/public/fairness-example'
import { ClosingCta, HowItWorks, LandingHero, Proof } from '@/components/public/landing-sections'
import { useSession } from '@/hooks/use-session'
import { formatPercent } from '@/lib/format'
import { m } from '@/paraglide/messages'

/** Floor of the sample chart, as a share of each person's own maximum. */
const FLOOR = 0.4

/**
 * Sample shares of five people on one plan, each as the part of what the person could get
 * alone (the "r" of the fairness algorithm). The page labels them as sample data.
 */
function exampleData(): { floor: number; people: ExamplePerson[] } {
  return {
    floor: FLOOR,
    people: [
      { name: m.example_person_1(), share: 0.81, tone: 4 },
      { name: m.example_person_2(), share: 0.72, tone: 1 },
      { name: m.example_person_3(), share: 0.69, tone: 5 },
      { name: m.example_person_4(), share: 0.64, tone: 2 },
      { name: m.example_person_5(), share: 0.58, tone: 3 },
    ],
  }
}

/**
 * The landing page for guests. The root layout never mounts it while the session loads or
 * for a signed-in user (shellFor says "bare"), so it cannot flash before the redirect.
 */
export function HomeView() {
  const session = useSession()
  const onSignup = session.status === 'anonymous' ? session.signup : undefined

  return (
    <>
      <LandingHero onSignup={onSignup} example={exampleData()} formatShare={formatPercent} />
      <HowItWorks />
      <Proof />
      <ClosingCta onSignup={onSignup} />
    </>
  )
}
