import { Bin, Pen } from '@keyline-icons/react'
import type { Expense } from '@/api/queries/expenses'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatDecimal } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { CATEGORY_LABELS } from './category-labels'
import { type PersonOption, personName } from './person-option'

interface ExpenseListProps {
  expenses: Expense[]
  people: PersonOption[]
  /** Whether the caller may edit or delete this expense (author, host or co-host). */
  canManage: (expense: Expense) => boolean
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

/** "everybody" when all people of the trip share the cost, else the names (the first three). */
function participantsLabel(expense: Expense, people: PersonOption[]): string {
  const ids = expense.participants.map((participant) => participant.profile_id)
  if (people.length > 0 && people.every((person) => ids.includes(person.id))) {
    return m.expense_for_everyone()
  }
  const names = ids.map((id) => personName(people, id, m.expense_person_unknown()))
  const shown = names.slice(0, 3).join(', ')
  return m.expense_for_people({ names: names.length > 3 ? `${shown} +${names.length - 3}` : shown })
}

export function ExpenseList({ expenses, people, canManage, onEdit, onDelete }: ExpenseListProps) {
  return (
    <ul className="flex flex-col">
      {expenses.map((expense) => {
        const title =
          expense.description ||
          (expense.category ? CATEGORY_LABELS[expense.category]() : m.expense_untitled())
        return (
          <li key={expense.id} className="flex items-start gap-3 border-b py-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate font-medium text-sm">{title}</p>
              <p className="text-muted-foreground text-sm">
                {formatDate(`${expense.spent_on}T12:00:00`)}
                {' · '}
                {m.expense_paid_by({
                  name: personName(people, expense.payer_profile_id, m.expense_person_unknown()),
                })}
              </p>
              <p className="text-muted-foreground text-sm">{participantsLabel(expense, people)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="font-semibold text-sm tabular-nums">
                {formatDecimal(expense.amount, expense.currency)}
              </p>
              {canManage(expense) && (
                <div className="-mr-2 flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 md:size-9"
                    aria-label={m.expense_edit_label({ title })}
                    onClick={() => onEdit(expense)}
                  >
                    <Pen />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 md:size-9"
                    aria-label={m.expense_delete_label({ title })}
                    onClick={() => onDelete(expense)}
                  >
                    <Bin />
                  </Button>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function ExpenseListSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {Array.from({ length: 5 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <Skeleton key={index} className="h-[74px] w-full" />
      ))}
    </div>
  )
}
