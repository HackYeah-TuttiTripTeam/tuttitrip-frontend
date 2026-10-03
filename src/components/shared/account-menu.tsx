import { CircleUser, Door, DoorOpen } from '@keyline-icons/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { barItemClass, tabClass } from './nav-classes'

export interface AccountState {
  status: 'disabled' | 'loading' | 'anonymous' | 'authenticated'
  userName: string | undefined
  userPicture: string | undefined
  onLogin: () => void
  onLogout: () => void
}

function initials(name: string | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function AccountAvatar({
  account,
  className,
}: {
  account: AccountState
  className?: string
}) {
  return (
    <Avatar className={className}>
      {account.userPicture && <AvatarImage src={account.userPicture} alt="" />}
      <AvatarFallback className="text-xs font-medium">
        {account.status === 'authenticated' ? initials(account.userName) : <CircleUser />}
      </AvatarFallback>
    </Avatar>
  )
}

/**
 * Login button for guests, a menu with logout for signed-in users and an
 * explanation when Auth0 is not configured.
 */
export function AccountMenu({
  account,
  variant,
}: {
  account: AccountState
  /** "bar": desktop top bar, "tab": mobile bottom action bar. */
  variant: 'bar' | 'tab'
}) {
  const className = variant === 'bar' ? barItemClass : tabClass

  if (account.status === 'anonymous') {
    return (
      <button type="button" onClick={account.onLogin} className={className}>
        <DoorOpen />
        Zaloguj się
      </button>
    )
  }

  const label = account.status === 'authenticated' ? (account.userName ?? 'Konto') : 'Konto'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={className} disabled={account.status === 'loading'}>
        <AccountAvatar account={account} className="size-6" />
        <span className={variant === 'bar' ? 'max-w-40 truncate' : 'max-w-full truncate px-1'}>
          {label}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={variant === 'tab' ? 'top' : 'bottom'} align="end" className="w-64">
        {account.status === 'authenticated' ? (
          <>
            <DropdownMenuLabel className="truncate">{account.userName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={account.onLogout}>
              <Door />
              Wyloguj się
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuLabel className="font-normal text-muted-foreground leading-relaxed">
            {account.status === 'loading'
              ? 'Sprawdzam sesję…'
              : 'Logowanie jest wyłączone: uzupełnij VITE_AUTH0_DOMAIN i VITE_AUTH0_CLIENT_ID w .env.local.'}
          </DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
