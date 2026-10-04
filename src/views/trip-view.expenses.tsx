import { CloudOff, KeyRound, Plus, Receipt, SearchX, TriangleAlert } from '@keyline-icons/react'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import type { Expense } from '@/api/queries/expenses'
import type { Trip } from '@/api/queries/trips'
import { DeleteExpenseConfirm } from '@/components/expenses/delete-expense-confirm'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { ExpenseList, ExpenseListSkeleton } from '@/components/expenses/expense-list'
import { ExpensesToolbar } from '@/components/expenses/expenses-toolbar'
import { SettlementPanel } from '@/components/expenses/settlement-panel'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDeleteExpense } from '@/hooks/use-delete-expense'
import { useExpenses } from '@/hooks/use-expenses'
import { useClampPage, useListSearch } from '@/hooks/use-list-search'
import { useMe } from '@/hooks/use-me'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useProfiles } from '@/hooks/use-profiles'
import { useSaveExpense } from '@/hooks/use-save-expense'
import { useSession } from '@/hooks/use-session'
import { useSettlement } from '@/hooks/use-settlement'
import { emptyExpenseForm, expenseToFormValues, expenseWriteFailure } from '@/lib/expense-form'
import { formatAmount } from '@/lib/format'
import { downloadTextFile, transfersToCsv } from '@/lib/settlement-csv'
import { EXPENSE_SECTIONS, type ExpenseSection, expenseFilterDefaults } from '@/loaders/expenses'
import { m } from '@/paraglide/messages'

const route = getRouteApi('/trips_/$tripId')

const SECTION_LABELS: Record<ExpenseSection, () => string> = {
  list: m.expense_section_list,
  settlement: m.expense_section_settlement,
}

interface TripExpensesViewProps {
  trip: Trip
}

/** The Wydatki tab: the expenses of the trip with their form, and the settlement (who pays whom). */
export function TripExpensesView({ trip }: TripExpensesViewProps) {
  const tripId = trip.id
  const session = useSession()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const { section } = route.useSearch()
  const navigate = route.useNavigate()
  const { search, setPage, setSize, setSort, setFilters, reset } = useListSearch(route, {
    filterDefaults: expenseFilterDefaults,
  })
  const { people: joined } = useProfiles(tripId, session.status)
  const people = joined.map((person) => ({
    id: person.profile.id,
    name: person.profile.display_name,
  }))
  const myProfileId = joined.find((person) => person.isMe)?.profile.id
  const sub = useMe(session.status).me?.sub

  const list = useExpenses(tripId, search, session.status)
  const settlement = useSettlement(tripId, session.status)
  useClampPage(search.page, list.pages, setPage)

  const [editing, setEditing] = useState<Expense | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const save = useSaveExpense(tripId, editing === null || editing === 'new' ? null : editing.id)
  const remove = useDeleteExpense(tripId)
  // A closed settlement takes no expense changes until the host reopens it (the API answers 409).
  const closed = settlement.settlement?.closed_at != null

  // The author, the host and a co-host may change an expense; the API checks it again (403).
  const canManage = (expense: Expense) =>
    !closed && (trip.my_role !== 'member' || (sub !== undefined && expense.created_by_sub === sub))

  const hasFilters = [
    search.payer,
    search.participant,
    search.category,
    search.from,
    search.to,
  ].some(Boolean)
  const setSection = (next: ExpenseSection) =>
    void navigate({ search: (prev) => ({ ...prev, section: next }), replace: true })

  const openNew = () => {
    save.reset()
    setEditing('new')
  }
  const openEdit = (expense: Expense) => {
    save.reset()
    setEditing(expense)
  }

  const addButton = closed ? null : (
    <Button onClick={openNew} className="hidden h-9 md:inline-flex">
      <Plus />
      {m.expense_add()}
    </Button>
  )

  const retry = (
    <Button variant="outline" onClick={list.refetch}>
      {m.action_retry()}
    </Button>
  )

  const pastTheEnd = list.pages !== undefined && list.pages > 0 && search.page > list.pages
  const showList = !list.problem && !list.forbidden && !list.isPending && !pastTheEnd

  const listBody = () => {
    if (list.isPending || pastTheEnd) return <ExpenseListSkeleton />
    if (list.forbidden) {
      return (
        <StatusMessage role="alert" icon={<KeyRound />} title={m.expense_forbidden_title()}>
          {m.expense_forbidden_body()}
        </StatusMessage>
      )
    }
    if (list.problem === 'offline') {
      return (
        <StatusMessage
          role="alert"
          icon={<CloudOff />}
          title={m.trips_offline_title()}
          action={retry}
        >
          {m.trips_offline_body()}
        </StatusMessage>
      )
    }
    if (list.problem) {
      return (
        <StatusMessage
          role="alert"
          icon={<TriangleAlert />}
          title={m.expense_load_failed_title()}
          action={retry}
        >
          {m.expense_load_failed_body()}
        </StatusMessage>
      )
    }
    if (list.total === 0 && !hasFilters) {
      return (
        <StatusMessage
          icon={<Receipt />}
          title={m.expense_empty_title()}
          action={
            closed ? undefined : (
              <Button onClick={openNew} className="h-11 md:h-9">
                <Plus />
                {m.expense_add()}
              </Button>
            )
          }
        >
          {m.expense_empty_body()}
        </StatusMessage>
      )
    }
    if (list.total === 0) {
      return (
        <StatusMessage
          icon={<SearchX />}
          title={m.expense_no_match_title()}
          action={
            <Button variant="outline" onClick={reset}>
              {m.trips_filters_clear()}
            </Button>
          }
        >
          {m.expense_no_match_body()}
        </StatusMessage>
      )
    }
    return (
      <div
        aria-busy={list.isPlaceholder}
        className={list.isPlaceholder ? 'opacity-60 transition-opacity' : undefined}
      >
        <ExpenseList
          expenses={list.expenses}
          people={people}
          canManage={canManage}
          onEdit={openEdit}
          onDelete={setDeleting}
        />
      </div>
    )
  }

  const settlementBody = () => {
    if (settlement.isPending) return <Skeleton aria-hidden="true" className="h-48 w-full" />
    if (settlement.problem || !settlement.settlement) {
      return (
        <StatusMessage
          role="alert"
          icon={<TriangleAlert />}
          title={m.settlement_load_failed_title()}
          action={
            <Button variant="outline" onClick={settlement.refetch}>
              {m.action_retry()}
            </Button>
          }
        >
          {m.settlement_load_failed_body()}
        </StatusMessage>
      )
    }
    const data = settlement.settlement
    const nameOf = (id: string) =>
      people.find((person) => person.id === id)?.name ?? m.expense_person_unknown()
    return (
      <SettlementPanel
        settlement={data}
        people={people}
        onAddExpense={closed ? undefined : openNew}
        onDownload={() =>
          downloadTextFile(
            'settlement.csv',
            transfersToCsv(data.transfers, data.currency, nameOf, [
              m.settlement_csv_person(),
              m.settlement_csv_recipient(),
              m.settlement_csv_amount(),
              m.settlement_csv_currency(),
            ]),
          )
        }
      />
    )
  }

  const total = settlement.settlement?.total_spent

  return (
    <div className="flex flex-col gap-4 pb-20 md:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          value={section}
          aria-label={m.expense_sections_label()}
          onValueChange={(value) => {
            const next = EXPENSE_SECTIONS.find((candidate) => candidate === value)
            if (next) setSection(next)
          }}
          className="w-full md:w-auto"
        >
          {EXPENSE_SECTIONS.map((value) => (
            <ToggleGroupItem key={value} value={value} className="md:px-6">
              {SECTION_LABELS[value]()}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {addButton}
      </div>

      {section === 'settlement' ? (
        settlementBody()
      ) : (
        <>
          {total !== undefined && (
            <p className="font-heading font-semibold tabular-nums" aria-live="polite">
              {m.settlement_total({
                amount: formatAmount(total, settlement.settlement?.currency ?? trip.currency),
              })}
            </p>
          )}
          {showList && (list.total > 0 || hasFilters) && (
            <ExpensesToolbar
              people={people}
              sort={search.sort}
              dir={search.dir}
              onSortChange={setSort}
              filters={search}
              onFiltersChange={setFilters}
              hasFilters={hasFilters}
              onReset={reset}
            />
          )}
          {listBody()}
          {showList && list.pages !== undefined && list.total > 0 && (
            <PaginationBar
              page={search.page}
              pages={list.pages}
              size={search.size}
              total={list.total}
              busy={list.isPlaceholder}
              onPageChange={(page) => setPage(page)}
              onSizeChange={setSize}
            />
          )}
        </>
      )}

      {/* Phones: the add action sits in a bar above the tab bar of the app shell. */}
      {!closed && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-background px-4 py-2 md:hidden">
          <Button onClick={openNew} className="h-11 w-full">
            <Plus />
            {m.expense_add()}
          </Button>
        </div>
      )}

      <ResponsiveModal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        isDesktop={isDesktop}
        title={editing === 'new' || editing === null ? m.expense_add() : m.expense_edit()}
        description={m.expense_form_description_modal()}
      >
        {editing !== null && (
          <ExpenseForm
            people={people}
            tripCurrency={trip.currency}
            initial={
              editing === 'new'
                ? emptyExpenseForm(
                    people.map((person) => person.id),
                    myProfileId ?? people[0]?.id ?? '',
                    trip.currency !== null,
                  )
                : expenseToFormValues(editing, trip.currency !== null)
            }
            fieldErrors={save.fieldErrors}
            submitError={save.submitError}
            isSubmitting={save.isPending}
            submitLabel={editing === 'new' ? m.expense_form_submit() : m.expense_form_submit_edit()}
            submittingLabel={m.expense_form_submitting()}
            onSubmit={async (values) => {
              if (await save.submit(values)) setEditing(null)
            }}
          />
        )}
      </ResponsiveModal>

      <ResponsiveModal
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            remove.reset()
          }
        }}
        isDesktop={isDesktop}
        title={m.expense_delete_title()}
        description={m.expense_delete_description()}
      >
        {deleting && (
          <DeleteExpenseConfirm
            title={deleting.description || m.expense_untitled()}
            isDeleting={remove.isPending}
            error={
              remove.isError ? expenseWriteFailure(remove.error, m.expense_delete_failed()) : null
            }
            onCancel={() => setDeleting(null)}
            onConfirm={() =>
              remove.mutate(
                { params: { path: { trip_id: tripId, expense_id: deleting.id } } },
                { onSuccess: () => setDeleting(null) },
              )
            }
          />
        )}
      </ResponsiveModal>
    </div>
  )
}
