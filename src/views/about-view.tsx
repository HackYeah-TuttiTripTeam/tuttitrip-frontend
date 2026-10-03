import { AboutInside, AboutIntro, AboutTeam } from '@/components/public/about-sections'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useSession } from '@/hooks/use-session'
import { m } from '@/paraglide/messages'

export function AboutView() {
  useDocumentTitle(m.nav_about())
  const session = useSession()
  return (
    <>
      <AboutIntro />
      <AboutInside />
      <AboutTeam onSignup={session.status === 'anonymous' ? session.signup : undefined} />
    </>
  )
}
