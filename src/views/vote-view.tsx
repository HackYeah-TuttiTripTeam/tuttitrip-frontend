import { CloudOff, Link as LinkIcon, TriangleAlert } from '@keyline-icons/react'
import type { ReactNode } from 'react'
import { BrandLogo } from '@/components/shared/brand-mark'
import { LanguageMenu } from '@/components/shared/language-menu'
import { StatusMessage } from '@/components/shared/status-message'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import { VotePage, VotePageSkeleton } from '@/components/voting/vote-page'
import { useLocale } from '@/hooks/use-locale'
import { useTheme } from '@/hooks/use-theme'
import { useVoteSession, useVoteToken } from '@/hooks/use-vote-session'
import { m } from '@/paraglide/messages'

/**
 * /glos#t=<token>: the voting page for a person without an account (shell "standalone", so no
 * app header, no sign-in prompt). It draws its own slim bar: the logo, language and theme.
 */
function Page({ children }: { children: ReactNode }) {
  const { locale, setLocale } = useLocale()
  const { theme, resolved, setTheme } = useTheme()
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 px-4 py-3">
        <BrandLogo className="h-8" />
        <div className="flex items-center gap-1">
          <LanguageMenu language={{ locale, onChange: setLocale }} />
          <ThemeToggle state={{ theme, resolved, onChange: setTheme }} />
        </div>
      </div>
      <main id="main" className="mx-auto w-full max-w-xl px-4 pt-2 pb-16">
        {children}
      </main>
    </div>
  )
}

export function VoteView() {
  const token = useVoteToken()
  const vote = useVoteSession(token)

  if (token === null || vote.problem === 'dead_link') {
    return (
      <Page>
        <StatusMessage
          icon={<LinkIcon />}
          title={token === null ? m.vote_missing_title() : m.vote_dead_title()}
        >
          {token === null ? m.vote_missing_body() : m.vote_dead_body()}
        </StatusMessage>
      </Page>
    )
  }

  if (vote.problem) {
    return (
      <Page>
        <StatusMessage
          role="alert"
          icon={vote.problem === 'offline' ? <CloudOff /> : <TriangleAlert />}
          title={vote.problem === 'offline' ? m.vote_offline_title() : m.vote_error_title()}
          action={
            <Button variant="outline" className="h-11" onClick={vote.refetch}>
              {m.action_retry()}
            </Button>
          }
        >
          {vote.problem === 'offline' ? m.vote_offline_body() : m.vote_error_body()}
        </StatusMessage>
      </Page>
    )
  }

  if (vote.isPending || !vote.session) {
    return (
      <Page>
        <VotePageSkeleton />
      </Page>
    )
  }

  return (
    <Page>
      <VotePage
        session={vote.session}
        busyPlaceId={vote.busyPlaceId}
        saved={vote.saved}
        failed={vote.writeFailed}
        onRate={(placeId, value, reason) => {
          vote.resetErrors()
          vote.rate({ placeId, value, reason })
        }}
        onVeto={(placeId) => {
          vote.resetErrors()
          vote.vetoPlace(placeId)
        }}
        onWithdrawVeto={(vetoId) => {
          vote.resetErrors()
          vote.withdrawVeto(vetoId)
        }}
      />
    </Page>
  )
}
