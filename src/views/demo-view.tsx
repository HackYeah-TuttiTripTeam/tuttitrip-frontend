import { Key, LoaderCircle } from '@keyline-icons/react'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { BrandLogo } from '@/components/shared/brand-mark'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { useDemoLogin } from '@/hooks/use-demo-login'
import { useDemoStatus } from '@/hooks/use-demo-session'
import { m } from '@/paraglide/messages'

/** /demo draws all of itself (shell "standalone"): a logo and one message, no header buttons. */
function Page({ children }: { children: ReactNode }) {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-6 bg-background px-4 py-10 text-foreground"
    >
      <BrandLogo className="h-9 self-start md:self-center" />
      {children}
    </main>
  )
}

export function DemoView() {
  const login = useDemoLogin()
  const status = useDemoStatus()

  if (login.phase === 'working') {
    return (
      <Page>
        <StatusMessage
          icon={<LoaderCircle className="animate-spin motion-reduce:animate-none" />}
          title={m.demo_entering_title()}
        >
          {m.demo_entering_body()}
        </StatusMessage>
      </Page>
    )
  }

  const copy =
    login.reason === 'invalid'
      ? { title: m.demo_invalid_title(), body: m.demo_invalid_body() }
      : login.reason === 'rate_limited'
        ? { title: m.demo_rate_limited_title(), body: m.demo_rate_limited_body() }
        : login.reason === 'unavailable'
          ? { title: m.demo_unavailable_title(), body: m.demo_unavailable_body() }
          : status === 'expired'
            ? { title: m.demo_expired_title(), body: m.demo_expired_body() }
            : { title: m.demo_missing_title(), body: m.demo_missing_body() }

  return (
    <Page>
      <StatusMessage
        role="alert"
        icon={<Key />}
        title={copy.title}
        action={
          <Button asChild variant="outline">
            <Link to="/">{m.demo_back_home()}</Link>
          </Button>
        }
      >
        {copy.body}
      </StatusMessage>
    </Page>
  )
}
