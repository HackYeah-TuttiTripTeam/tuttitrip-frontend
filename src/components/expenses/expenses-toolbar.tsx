import { ArrowDownWideNarrow, ArrowUpNarrowWide } from '@keyline-icons/react'
import type { ExpenseCategory, ExpenseSort } from '@/api/queries/expenses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EXPENSE_CATEGORIES, EXPENSE_SORT_KEYS } from '@/lib/expense-form'
import { m } from '@/paraglide/messages'
import { CATEGORY_LABELS } from './category-labels'
import type { PersonOption } from './person-option'

export interface ExpenseFilters {
  payer?: string | undefined
  participant?: string | undefined
  category?: ExpenseCategory | undefined
  from?: string | undefined
  to?: string | undefined
}

interface ExpensesToolbarProps {
  people: PersonOption[]
  sort: ExpenseSort
  dir: 'asc' | 'desc'
  onSortChange: (sort: ExpenseSort, dir: 'asc' | 'desc') => void
  filters: ExpenseFilters
  onFiltersChange: (patch: Partial<ExpenseFilters>) => void
  hasFilters: boolean
  onReset: () => void
}

const ALL = 'all'
const SORT_LABELS: Record<ExpenseSort, () => string> = {
  spent_on: m.expense_sort_spent_on,
  amount: m.expense_sort_amount,
  created_at: m.expense_sort_created_at,
}
const isSortKey = (value: string): value is ExpenseSort =>
  EXPENSE_SORT_KEYS.some((key) => key === value)
const asCategory = (value: string) => EXPENSE_CATEGORIES.find((key) => key === value)

/** Sort, who paid, who takes part, category and a date range. All of it lives in the URL. */
export function ExpensesToolbar({
  people,
  sort,
  dir,
  onSortChange,
  filters,
  onFiltersChange,
  hasFilters,
  onReset,
}: ExpensesToolbarProps) {
  const ascending = dir === 'asc'
  const personSelect = (
    label: string,
    value: string | undefined,
    onChange: (id: string | undefined) => void,
  ) => (
    <Select
      value={value ?? ALL}
      onValueChange={(next) => onChange(next === ALL ? undefined : next)}
    >
      <SelectTrigger aria-label={label} className="h-11 w-full sm:h-9 sm:w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label}</SelectItem>
        {people.map((person) => (
          <SelectItem key={person.id} value={person.id}>
            {person.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <search className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Select
          value={sort}
          onValueChange={(value) => isSortKey(value) && onSortChange(value, dir)}
        >
          <SelectTrigger
            aria-label={m.expense_sort_by()}
            className="h-11 flex-1 sm:h-9 sm:w-48 sm:flex-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPENSE_SORT_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {SORT_LABELS[key]()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onSortChange(sort, ascending ? 'desc' : 'asc')}
          aria-label={ascending ? m.trips_sort_ascending() : m.trips_sort_descending()}
          className="size-11 sm:size-9"
        >
          {ascending ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
        {personSelect(m.expense_filter_payer(), filters.payer, (payer) =>
          onFiltersChange({ payer }),
        )}
        {personSelect(m.expense_filter_participant(), filters.participant, (participant) =>
          onFiltersChange({ participant }),
        )}
        <Select
          value={filters.category ?? ALL}
          onValueChange={(value) => onFiltersChange({ category: asCategory(value) })}
        >
          <SelectTrigger
            aria-label={m.expense_filter_category()}
            className="h-11 w-full sm:h-9 sm:w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{m.expense_filter_category()}</SelectItem>
            {EXPENSE_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {CATEGORY_LABELS[category]()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-col gap-1">
          <Label htmlFor="expenses-from" className="text-muted-foreground text-xs">
            {m.expense_filter_from()}
          </Label>
          <Input
            id="expenses-from"
            type="date"
            value={filters.from ?? ''}
            max={filters.to}
            onChange={(event) => onFiltersChange({ from: event.target.value || undefined })}
            className="h-11 sm:h-9 sm:w-40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="expenses-to" className="text-muted-foreground text-xs">
            {m.expense_filter_to()}
          </Label>
          <Input
            id="expenses-to"
            type="date"
            value={filters.to ?? ''}
            min={filters.from}
            onChange={(event) => onFiltersChange({ to: event.target.value || undefined })}
            className="h-11 sm:h-9 sm:w-40"
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" onClick={onReset} className="col-span-2 h-11 sm:h-9">
            {m.trips_filters_clear()}
          </Button>
        )}
      </div>
    </search>
  )
}
