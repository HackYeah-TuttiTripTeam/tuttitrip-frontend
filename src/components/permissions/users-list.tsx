import { ChevronRight } from '@keyline-icons/react'
import { m } from '@/paraglide/messages'

interface UsersListProps {
  subs: string[]
  onOpen: (sub: string) => void
}

/** Users who hold a role or a direct grant, by their Auth0 `sub`. */
export function UsersList({ subs, onOpen }: UsersListProps) {
  return (
    <ul className="flex flex-col divide-y border-y">
      {subs.map((sub) => (
        <li key={sub}>
          <button
            type="button"
            onClick={() => onOpen(sub)}
            aria-label={m.perm_user_open({ sub })}
            className="flex min-h-14 w-full items-center gap-3 px-1 py-3 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-sm">{sub}</span>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  )
}
