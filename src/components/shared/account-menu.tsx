import { CircleUser, Door, DoorOpen, ShieldCheck } from '@keyline-icons/react'
import { Link } from '@tanstack/react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isDev } from '@/lib/env'
import { m } from '@/paraglide/messages'
import { barItemClass, tabClass } from './nav-classes'
import { ThemeRadioGroup, type ThemeState } from './theme-toggle'

export interface AccountState {
  status: 'disabled' | 'loading' | 'anonymous' | 'authenticated'
  userName: string | undefined
  userPicture: string | undefined
  /** The API says this account may open the permission panel (admins only). */
  showPermissions?: boolean
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
  theme,
}: {
  account: AccountState
  /** "bar": desktop top bar, "tab": mobile bottom action bar. */
  variant: 'bar' | 'tab'
  /** Phones have no theme button in the top bar, so the tab menu carries the choice. */
  theme?: ThemeState
}) {
  const className = variant === 'bar' ? barItemClass : tabClass

  if (account.status === 'anonymous') {
    return (
      <button type="button" onClick={account.onLogin} className={className}>
        <DoorOpen />
        {m.account_login()}
      </button>
    )
  }

  const label =
    account.status === 'authenticated' ? (account.userName ?? m.account_label()) : m.account_label()

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
            {theme && variant === 'tab' && (
              <>
                <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
                  {m.theme_label()}
                </DropdownMenuLabel>
                <ThemeRadioGroup state={theme} />
                <DropdownMenuSeparator />
              </>
            )}
            {account.showPermissions && (
              <DropdownMenuItem asChild>
                <Link to="/admin/permissions">
                  <ShieldCheck />
                  {m.perm_title()}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={account.onLogout}>
              <Door />
              {m.account_logout()}
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuLabel className="font-normal text-muted-foreground leading-relaxed">
            {account.status === 'loading'
              ? m.account_checking_session()
              : isDev
                ? m.account_auth_disabled_dev()
                : m.account_auth_disabled()}
          </DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
