import { useState } from 'react'
import type { Role, UserPermissions } from '@/api/queries/permissions'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type Feature,
  type FeatureRow,
  grantsToMap,
  isLockedRole,
  type Level,
} from '@/lib/permissions'
import { m } from '@/paraglide/messages'
import { GrantsEditor } from './grants-editor'
import { LEVEL_LABELS } from './level-labels'

interface UserPanelProps {
  /** Undefined while loading or failed. */
  user: UserPermissions | undefined
  isLoading: boolean
  failed: boolean
  roles: Role[]
  rows: FeatureRow[]
  readOnly: boolean
  isBusy: boolean
  error: string | null
  onAssign: (role: string) => void
  onRevoke: (role: string) => void
  onGrant: (feature: Feature, level: Level) => void
  onClose: () => void
}

/** Roles and direct grants of one user. Every change is its own request and saves at once. */
export function UserPanel({
  user,
  isLoading,
  failed,
  roles,
  rows,
  readOnly,
  isBusy,
  error,
  onAssign,
  onRevoke,
  onGrant,
  onClose,
}: UserPanelProps) {
  const [pick, setPick] = useState('')
  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (failed || !user) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {m.perm_user_load_failed()}
      </p>
    )
  }

  // superadmin only comes from Auth0, so it is never offered here.
  const assignable = roles.filter(
    (role) => !isLockedRole(role.name) && !user.roles.includes(role.name),
  )
  const effective = Object.entries(user.effective).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="flex flex-col gap-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <p className="break-all font-mono text-sm">{user.sub}</p>

      <section className="flex flex-col gap-3">
        <h3 className="font-medium text-sm">{m.perm_user_roles()}</h3>
        {user.roles.length === 0 ? (
          <p className="text-muted-foreground text-sm">{m.perm_user_roles_empty()}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {user.roles.map((role) => (
              <li key={role} className="flex items-center gap-1 rounded-full border py-1 pr-1 pl-3">
                <span className="font-mono text-sm">{role}</span>
                {!readOnly && !isLockedRole(role) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => onRevoke(role)}
                    aria-label={m.perm_user_role_remove({ role })}
                    className="h-9 rounded-full px-2 text-muted-foreground"
                  >
                    ×
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!readOnly && assignable.length > 0 && (
          <div className="flex gap-2">
            <Select value={pick} onValueChange={setPick}>
              <SelectTrigger aria-label={m.perm_user_role_add()} className="h-11 flex-1 md:h-9">
                <SelectValue placeholder={m.perm_user_role_add_pick()} />
              </SelectTrigger>
              <SelectContent>
                {assignable.map((role) => (
                  <SelectItem key={role.name} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={isBusy || !pick}
              onClick={() => {
                onAssign(pick)
                setPick('')
              }}
              className="h-11 md:h-9"
            >
              {m.perm_user_role_add_button()}
            </Button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-medium text-sm">{m.perm_user_grants()}</h3>
        <p className="text-muted-foreground text-xs leading-relaxed">{m.perm_grants_hint()}</p>
        <GrantsEditor
          rows={rows}
          grants={grantsToMap(user.grants)}
          disabled={readOnly || isBusy}
          onChange={onGrant}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-medium text-sm">{m.perm_user_effective()}</h3>
        {effective.length === 0 ? (
          <p className="text-muted-foreground text-sm">{m.perm_user_effective_empty()}</p>
        ) : (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {effective.map(([feature, level]) => (
              <li key={feature}>
                <span className="font-mono">{feature}</span>{' '}
                <span className="text-muted-foreground">{LEVEL_LABELS[level]()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && (
        <p role="alert" className="text-destructive text-sm leading-relaxed">
          {error}
        </p>
      )}

      <Button variant="outline" onClick={onClose} className="h-11 md:h-9">
        {m.perm_close()}
      </Button>
    </div>
  )
}
