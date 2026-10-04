import {
  ArrowRight,
  ArrowUTurnLeft,
  Check,
  Download,
  Lock,
  Plus,
  Receipt,
  Unlock,
} from '@keyline-icons/react'
import type { Payment, Settlement, SettlementTransfer } from '@/api/queries/settlement'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { formatAmount, formatDate } from '@/lib/format'
import { compareDecimals } from '@/lib/money'
import { m } from '@/paraglide/messages'
import { type PersonOption, personName } from './person-option'

interface SettlementPanelProps {
  settlement: Settlement
  people: PersonOption[]
  onDownload: () => void
  /** Hidden when the caller cannot add expenses. */
  onAddExpense?: (() => void) | undefined
  /** Only the host closes and reopens the settlement; everybody else sees the state. */
  isHost: boolean
  onRequestClose: () => void
  onRequestReopen: () => void
  /** Payments already marked as made, newest first. */
  payments: Payment[]
  /** The payer, the receiver and the host may mark a transfer as paid or take the mark back. */
  canMark: (from: string, to: string) => boolean
  /** Key of the transfer or payment being written now, to disable just that button. */
  busyKey: string | null
  onMarkPaid: (transfer: SettlementTransfer) => void
  onUndoPayment: (payment: Payment) => void
  /** Why the last settlement write failed, when it did. */
  actionError: string | null
}

export const transferKey = (
  transfer: Pick<SettlementTransfer, 'from_profile_id' | 'to_profile_id'>,
) => `${transfer.from_profile_id}-${transfer.to_profile_id}`

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
  isHost,
  onRequestClose,
  onRequestReopen,
  payments,
  canMark,
  busyKey,
  onMarkPaid,
  onUndoPayment,
  actionError,
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-heading font-semibold tabular-nums">
          {m.settlement_total({ amount: formatAmount(settlement.total_spent, currency) })}
        </p>
        {isHost && (
          <Button
            variant="outline"
            onClick={closed ? onRequestReopen : onRequestClose}
            className="h-11 md:h-9"
          >
            {closed ? <Unlock /> : <Lock />}
            {closed ? m.settlement_reopen() : m.settlement_close()}
          </Button>
        )}
      </div>
      {closed && (
        <p role="status" className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
          <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            {settlement.closed_at && (
              <strong className="mr-1">
                {m.settlement_closed_on({ date: formatDate(settlement.closed_at) })}
              </strong>
            )}
            {m.settlement_closed_note()}
          </span>
        </p>
      )}
      {actionError && (
        <p role="alert" className="text-destructive text-sm">
          {actionError}
        </p>
      )}

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
                key={transferKey(transfer)}
                className="flex min-h-12 flex-wrap items-center gap-x-2 gap-y-1 border-b py-2 text-sm"
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
                {!closed && canMark(transfer.from_profile_id, transfer.to_profile_id) && (
                  <Button
                    variant="outline"
                    disabled={busyKey === transferKey(transfer)}
                    onClick={() => onMarkPaid(transfer)}
                    aria-label={m.settlement_mark_paid_label({
                      from: name(transfer.from_profile_id),
                      to: name(transfer.to_profile_id),
                    })}
                    className="h-11 md:h-9"
                  >
                    <Check />
                    {m.settlement_mark_paid()}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {payments.length > 0 && (
        <section aria-labelledby="settlement-payments" className="flex flex-col gap-2">
          <h2 id="settlement-payments" className="font-medium text-base">
            {m.settlement_payments_title()}
          </h2>
          <ul>
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex min-h-12 flex-wrap items-center gap-x-2 gap-y-1 border-b py-2 text-sm"
              >
                <span className="min-w-0 flex-1">
                  {m.settlement_payment_line({
                    from: name(payment.from_profile_id),
                    to: name(payment.to_profile_id),
                    date: formatDate(`${payment.paid_on}T12:00:00`),
                  })}
                </span>
                <span className="font-semibold tabular-nums">
                  {formatAmount(payment.amount, currency)}
                </span>
                {!closed && canMark(payment.from_profile_id, payment.to_profile_id) && (
                  <Button
                    variant="ghost"
                    disabled={busyKey === payment.id}
                    onClick={() => onUndoPayment(payment)}
                    aria-label={m.settlement_undo_label({
                      from: name(payment.from_profile_id),
                      to: name(payment.to_profile_id),
                    })}
                    className="h-11 md:h-9"
                  >
                    <ArrowUTurnLeft />
                    {m.settlement_undo()}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

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
