import { ChevronRight, Lock } from '@keyline-icons/react'
import type { Role } from '@/api/queries/permissions'
import { Skeleton } from '@/components/ui/skeleton'
import { isLockedRole } from '@/lib/permissions'
import { m } from '@/paraglide/messages'

interface RolesListProps {
  roles: Role[]
  onOpen: (name: string) => void
}

/** One row per role: name, what it is, how many grants it holds. The whole row opens the editor. */
export function RolesList({ roles, onOpen }: RolesListProps) {
  return (
    <ul className="flex flex-col divide-y border-y">
      {roles.map((role) => (
        <li key={role.name}>
          <button
            type="button"
            onClick={() => onOpen(role.name)}
            aria-label={m.perm_role_open({ name: role.name })}
            className="flex min-h-14 w-full items-center gap-3 px-1 py-3 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium font-mono text-sm">{role.name}</span>
                {role.is_system && (
                  <span className="rounded-full border px-2 py-0.5 text-muted-foreground text-xs">
                    {m.perm_role_system()}
                  </span>
                )}
                {isLockedRole(role.name) && (
                  <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-muted-foreground text-xs">
                    <Lock aria-hidden="true" className="size-3" />
                    {m.perm_role_locked()}
                  </span>
                )}
              </p>
              <p className="truncate text-muted-foreground text-sm">
                {role.description || m.perm_role_no_description()}
              </p>
            </div>
            <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
              {m.perm_role_grants({ count: role.grants.length })}
            </span>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {['a', 'b', 'c', 'd'].map((key) => (
        <Skeleton key={key} className="h-14 w-full" />
      ))}
    </div>
  )
}
