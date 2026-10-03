import { AboutInside, AboutIntro, AboutTeam } from '@/components/public/about-sections'
import { useSession } from '@/hooks/use-session'

export function AboutView() {
  const session = useSession()
  return (
    <>
      <AboutIntro />
      <AboutInside />
      <AboutTeam onSignup={session.status === 'anonymous' ? session.signup : undefined} />
    </>
  )
}
