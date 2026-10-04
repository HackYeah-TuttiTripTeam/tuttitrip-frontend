import { CloudOff, KeyRound, TriangleAlert } from '@keyline-icons/react'
import { AccountSettings } from '@/components/account/account-settings'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccount } from '@/hooks/use-account'
import { useSession } from '@/hooks/use-session'
import { useUpdateAccount } from '@/hooks/use-update-account'
import { m } from '@/paraglide/messages'

export function AccountView() {
  const session = useSession()
  const { provider, isPending, problem, refetch } = useAccount(session.status)
  const { rename } = useUpdateAccount()

  const title = (
    <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
      {m.account_settings_title()}
    </h1>
  )

  if (session.status === 'anonymous' || problem === 'unauthorized') {
    return (
      <StatusMessage
        icon={<KeyRound />}
        title={m.trips_login_required_title()}
        action={<Button onClick={session.login}>{m.account_login()}</Button>}
      >
        {m.trips_login_required_body()}
      </StatusMessage>
    )
  }

  if (session.status === 'loading' || isPending) {
    return (
      <div className="flex flex-col gap-6" aria-hidden="true">
        {title}
        <Skeleton className="h-9 w-full max-w-xl" />
        <Skeleton className="h-9 w-32" />
      </div>
    )
  }

  if (problem) {
    return (
      <StatusMessage
        role="alert"
        icon={problem === 'offline' ? <CloudOff /> : <TriangleAlert />}
        title={problem === 'offline' ? m.trips_offline_title() : m.account_settings_load_failed()}
        action={
          <Button variant="outline" onClick={refetch}>
            {m.action_retry()}
          </Button>
        }
      >
        {problem === 'offline' ? m.trips_offline_body() : m.trips_load_failed_body()}
      </StatusMessage>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {title}
      <AccountSettings name={session.userName ?? ''} provider={provider} onRename={rename} />
    </div>
  )
}
