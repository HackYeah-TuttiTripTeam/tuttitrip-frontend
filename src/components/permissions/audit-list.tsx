import type { AuditEntry } from '@/api/queries/permissions'
import { formatDate, formatTime } from '@/lib/format'
import { m } from '@/paraglide/messages'

/** Read-only log of role and grant changes. `change` is whatever the API recorded. */
export function AuditList({ entries }: { entries: AuditEntry[] }) {
  return (
    <ul className="flex flex-col divide-y border-y">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-1 px-1 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-medium font-mono text-sm">{entry.action}</p>
            <time
              dateTime={entry.created_at}
              className="whitespace-nowrap text-muted-foreground text-xs tabular-nums"
            >
              {formatDate(entry.created_at)}, {formatTime(entry.created_at)}
            </time>
          </div>
          <p className="break-all text-muted-foreground text-xs leading-relaxed">
            {m.perm_audit_actor({ actor: entry.actor_sub })}
            {entry.target_sub && ` · ${m.perm_audit_target({ target: entry.target_sub })}`}
            {entry.target_role && ` · ${m.perm_audit_role({ role: entry.target_role })}`}
          </p>
          {Object.keys(entry.change).length > 0 && (
            <p className="break-all font-mono text-muted-foreground text-xs">
              {JSON.stringify(entry.change)}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
