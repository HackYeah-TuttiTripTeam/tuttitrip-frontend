import { ArrowRight, Download, Plus, Receipt } from '@keyline-icons/react'
import type { Settlement } from '@/api/queries/settlement'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { formatAmount } from '@/lib/format'
import { compareDecimals } from '@/lib/money'
import { m } from '@/paraglide/messages'
import { type PersonOption, personName } from './person-option'

interface SettlementPanelProps {
  settlement: Settlement
  people: PersonOption[]
  onDownload: () => void
  /** Hidden when the caller cannot add expenses. */
  onAddExpense?: (() => void) | undefined
}

/** Positive: owed money (primary). Negative: owes (destructive). Zero: muted. Tokens only. */
const balanceClass = (balance: string) => {
  const sign = compareDecimals(balance, '0')
  return sign > 0 ? 'text-primary' : sign < 0 ? 'text-destructive' : 'text-muted-foreground'
}

/** The API's balances and transfers, shown as they come: nothing is added up on the client. */
export function SettlementPanel({
  settlement,
  people,
  onDownload,
  onAddExpense,
}: SettlementPanelProps) {
  const { currency, balances, transfers } = settlement
  const closed = settlement.closed_at != null
  const name = (id: string) => personName(people, id, m.expense_person_unknown())

  if (compareDecimals(settlement.total_spent, '0') === 0 && transfers.length === 0) {
    return (
      <StatusMessage
        icon={<Receipt />}
        title={m.settlement_empty_title()}
        action={
          onAddExpense &&
          !closed && (
            <Button onClick={onAddExpense} className="h-11 md:h-9">
              <Plus />
              {m.expense_add()}
            </Button>
          )
        }
      >
        {m.settlement_empty_body()}
      </StatusMessage>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {closed && (
        <p role="status" className="rounded-md border px-3 py-2 text-sm">
          {m.settlement_closed_note()}
        </p>
      )}
      <p className="font-heading font-semibold tabular-nums">
        {m.settlement_total({ amount: formatAmount(settlement.total_spent, currency) })}
      </p>

      <section aria-labelledby="settlement-transfers" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 id="settlement-transfers" className="font-medium text-base">
            {m.settlement_transfers_title()}
          </h2>
          {transfers.length > 0 && (
            <Button variant="outline" onClick={onDownload} className="h-11 md:h-9">
              <Download />
              {m.settlement_download()}
            </Button>
          )}
        </div>
        {transfers.length === 0 ? (
          <p className="text-muted-foreground text-sm">{m.settlement_transfers_none()}</p>
        ) : (
          <ul>
            {transfers.map((transfer) => (
              <li
                key={`${transfer.from_profile_id}-${transfer.to_profile_id}`}
                className="flex min-h-12 items-center gap-2 border-b py-2 text-sm"
              >
                <span className="min-w-0 truncate font-medium">
                  {name(transfer.from_profile_id)}
                </span>
                <ArrowRight
                  aria-label={m.settlement_pays()}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {name(transfer.to_profile_id)}
                </span>
                <span className="font-semibold tabular-nums">
                  {formatAmount(transfer.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="settlement-balances" className="flex flex-col gap-2">
        <h2 id="settlement-balances" className="font-medium text-base">
          {m.settlement_balances_title()}
        </h2>
        <ul>
          {balances.map((entry) => (
            <li
              key={entry.profile_id}
              className="flex min-h-12 items-center justify-between gap-3 border-b py-2 text-sm"
            >
              <span className="min-w-0 truncate">{name(entry.profile_id)}</span>
              <span className={`font-semibold tabular-nums ${balanceClass(entry.amount)}`}>
                {compareDecimals(entry.amount, '0') > 0 && '+'}
                {formatAmount(entry.amount, currency)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
