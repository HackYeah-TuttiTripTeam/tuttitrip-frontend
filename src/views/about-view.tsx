import {
  AboutInside,
  AboutIntro,
  AboutPhotoPhone,
  AboutSplit,
  AboutTeam,
} from '@/components/public/about-sections'
import { useSession } from '@/hooks/use-session'

export function AboutView() {
  const session = useSession()
  return (
    <>
      <AboutIntro />
      <AboutPhotoPhone />
      <AboutSplit />
      <AboutInside />
      <AboutTeam onSignup={session.status === 'anonymous' ? session.signup : undefined} />
    </>
  )
}
