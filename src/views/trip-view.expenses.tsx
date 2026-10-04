import {
  Camera,
  CloudOff,
  KeyRound,
  Plus,
  Receipt,
  SearchX,
  TriangleAlert,
} from '@keyline-icons/react'
import { getRouteApi } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import type { Expense } from '@/api/queries/expenses'
import type { Trip } from '@/api/queries/trips'
import { DeleteExpenseConfirm } from '@/components/expenses/delete-expense-confirm'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { ExpenseList, ExpenseListSkeleton } from '@/components/expenses/expense-list'
import { ExpensesToolbar } from '@/components/expenses/expenses-toolbar'
import { ReceiptConfirmCard } from '@/components/expenses/receipt-confirm-card'
import { ReceiptFailed, ReceiptProgress } from '@/components/expenses/receipt-progress'
import { SettlementPanel, transferKey } from '@/components/expenses/settlement-panel'
import { SettlementStateConfirm } from '@/components/expenses/settlement-state-confirm'
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
import { usePayments } from '@/hooks/use-payments'
import { useProfiles } from '@/hooks/use-profiles'
import { useReceipt } from '@/hooks/use-receipt'
import { useReceiptImage } from '@/hooks/use-receipt-image'
import { useSaveExpense } from '@/hooks/use-save-expense'
import { useSession } from '@/hooks/use-session'
import { useSettlement } from '@/hooks/use-settlement'
import { settlementWriteFailure, useSettlementActions } from '@/hooks/use-settlement-actions'
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
  const { payments } = usePayments(tripId, session.status)
  const actions = useSettlementActions(tripId)
  const isHost = trip.my_role === 'host'
  const [stateDialog, setStateDialog] = useState<'close' | 'reopen' | null>(null)
  useClampPage(search.page, list.pages, setPage)

  const [editing, setEditing] = useState<Expense | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const editedDraft = editing !== null && editing !== 'new' && editing.status === 'draft'
  const save = useSaveExpense(
    tripId,
    editing === null || editing === 'new' ? null : editing.id,
    editedDraft,
  )
  const receipt = useReceipt(tripId)
  const receiptDraft = receipt.receipt?.expense ?? null
  const receiptSave = useSaveExpense(tripId, receiptDraft?.id ?? null, true)
  const receiptImage = useReceiptImage(
    tripId,
    receipt.phase === 'ready' ? receipt.evidenceId : null,
  )
  const photoInput = useRef<HTMLInputElement>(null)
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

  const busyKey = actions.markPaid.isPending
    ? transferKey(actions.markPaid.variables.body)
    : actions.removePayment.isPending
      ? actions.removePayment.variables.params.path.payment_id
      : null
  const paymentError = actions.markPaid.isError
    ? settlementWriteFailure(actions.markPaid.error, 'payment')
    : actions.removePayment.isError
      ? settlementWriteFailure(actions.removePayment.error, 'payment')
      : null
  const stateMutation = stateDialog === 'reopen' ? actions.reopen : actions.close
  const openStateDialog = (mode: 'close' | 'reopen') => {
    actions.close.reset()
    actions.reopen.reset()
    setStateDialog(mode)
  }
  const changeState = () =>
    stateMutation.mutate(
      { params: { path: { trip_id: tripId } } },
      { onSuccess: () => setStateDialog(null) },
    )

  const pickPhoto = () => photoInput.current?.click()
  const closeReceipt = () => {
    receipt.reset()
    receiptSave.reset()
  }
  const enterByHand = () => {
    closeReceipt()
    openNew()
  }

  const addButton = closed ? null : (
    <div className="hidden gap-2 md:flex">
      <Button variant="outline" onClick={pickPhoto} className="h-9">
        <Camera />
        {m.receipt_add()}
      </Button>
      <Button onClick={openNew} className="h-9">
        <Plus />
        {m.expense_add()}
      </Button>
    </div>
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
        isHost={isHost}
        onRequestClose={() => openStateDialog('close')}
        onRequestReopen={() => openStateDialog('reopen')}
        payments={payments}
        // The payer, the receiver and the host; the API checks it again (403).
        canMark={(from, to) =>
          isHost || (myProfileId !== undefined && [from, to].includes(myProfileId))
        }
        busyKey={busyKey}
        onMarkPaid={(transfer) =>
          actions.markPaid.mutate({
            params: { path: { trip_id: tripId } },
            body: {
              from_profile_id: transfer.from_profile_id,
              to_profile_id: transfer.to_profile_id,
              amount: transfer.amount,
            },
          })
        }
        onUndoPayment={(payment) =>
          actions.removePayment.mutate({
            params: { path: { trip_id: tripId, payment_id: payment.id } },
          })
        }
        actionError={paymentError}
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
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t bg-background px-4 py-2 md:hidden">
          <Button variant="outline" onClick={pickPhoto} className="h-11 flex-1">
            <Camera />
            {m.receipt_add()}
          </Button>
          <Button onClick={openNew} className="h-11 flex-1">
            <Plus />
            {m.expense_add()}
          </Button>
        </div>
      )}

      {/* The camera on phones, the file picker elsewhere; the same photo can be chosen twice. */}
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="receipt-input"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void receipt.start(file)
        }}
      />

      <ResponsiveModal
        open={receipt.phase !== 'idle'}
        onOpenChange={(open) => !open && closeReceipt()}
        isDesktop={isDesktop}
        title={m.receipt_title()}
        description={m.receipt_description()}
      >
        {(receipt.phase === 'preparing' ||
          receipt.phase === 'uploading' ||
          receipt.phase === 'reading') && (
          <ReceiptProgress phase={receipt.phase} percent={receipt.percent} />
        )}
        {receipt.phase === 'failed' && (
          <ReceiptFailed
            failure={receipt.failure ?? 'unknown'}
            onRetry={receipt.retry}
            onManual={enterByHand}
            onClose={closeReceipt}
          />
        )}
        {receipt.phase === 'ready' && receiptDraft && (
          <ReceiptConfirmCard
            draft={receiptDraft}
            people={people}
            tripCurrency={trip.currency}
            imageUrl={receiptImage}
            needsConfirmation={receipt.receipt?.needs_confirmation ?? null}
            reasons={receipt.receipt?.reasons ?? []}
            fieldErrors={receiptSave.fieldErrors}
            submitError={receiptSave.submitError}
            isSubmitting={receiptSave.isPending}
            onSubmit={async (values) => {
              if (await receiptSave.submit(values)) closeReceipt()
            }}
          />
        )}
      </ResponsiveModal>

      <ResponsiveModal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        isDesktop={isDesktop}
        title={
          editing === 'new' || editing === null
            ? m.expense_add()
            : editedDraft
              ? m.receipt_card_title()
              : m.expense_edit()
        }
        description={m.expense_form_description_modal()}
      >
        {editing !== null && editing !== 'new' && editing.status === 'draft' && (
          <ReceiptConfirmCard
            draft={editing}
            people={people}
            tripCurrency={trip.currency}
            imageUrl={null}
            needsConfirmation={null}
            reasons={[]}
            fieldErrors={save.fieldErrors}
            submitError={save.submitError}
            isSubmitting={save.isPending}
            onSubmit={async (values) => {
              if (await save.submit(values)) setEditing(null)
            }}
          />
        )}
        {editing !== null && !editedDraft && (
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
        open={stateDialog !== null}
        onOpenChange={(open) => !open && setStateDialog(null)}
        isDesktop={isDesktop}
        title={stateDialog === 'reopen' ? m.settlement_reopen() : m.settlement_close()}
        description={m.settlement_state_description()}
      >
        {stateDialog !== null && (
          <SettlementStateConfirm
            mode={stateDialog}
            isPending={stateMutation.isPending}
            error={
              stateMutation.isError ? settlementWriteFailure(stateMutation.error, 'state') : null
            }
            onConfirm={changeState}
            onCancel={() => setStateDialog(null)}
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
