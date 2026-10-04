import { ClipboardPaste, CloudOff, KeyRound, TriangleAlert } from '@keyline-icons/react'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { PASTE_MAX_CHARS } from '@/api/queries/linter'
import type { Trip } from '@/api/queries/trips'
import { LintCompare } from '@/components/linter/lint-compare'
import { PasteForm } from '@/components/linter/paste-form'
import { RuleList } from '@/components/linter/rule-list'
import { UnrecognizedItems } from '@/components/linter/unrecognized-items'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { type PasteFailure, usePasteLint } from '@/hooks/use-paste-lint'
import { usePlan } from '@/hooks/use-plan'
import { usePlanLint } from '@/hooks/use-plan-lint'
import { m } from '@/paraglide/messages'

const route = getRouteApi('/trips_/$tripId')

const SUBMIT_FAILURE: Record<PasteFailure, () => string> = {
  offline: m.lint_failure_offline,
  too_long: m.lint_failure_too_long,
  unavailable: m.lint_failure_unavailable,
  forbidden: m.lint_failure_forbidden,
  unknown: m.lint_failure_unknown,
}

interface TripLintViewProps {
  trip: Trip
}

/** The check of a plan pasted from a chatbot, next to the real lint of the trip's own plan. */
export function TripLintView({ trip }: TripLintViewProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const { paste: pasteId } = route.useSearch()
  const navigate = route.useNavigate()
  const { plan, hasNoPlan } = usePlan(trip.id)
  const ours = usePlanLint(trip.id, plan?.id)
  const [open, setOpen] = useState(false)
  const lint = usePasteLint(trip.id, pasteId, (created) => {
    setOpen(false)
    void navigate({ search: (prev) => ({ ...prev, paste: created }), replace: true })
  })
  const [text, setText] = useState('')
  const canChoose = trip.my_role !== 'member'

  const openPaste = () => {
    lint.resetSubmit()
    setOpen(true)
  }

  const pasteButton = (
    <Button onClick={openPaste} className="h-11 md:h-9">
      <ClipboardPaste />
      {pasteId ? m.lint_paste_again() : m.lint_paste_open()}
    </Button>
  )

  const body = () => {
    if (!pasteId) {
      return (
        <StatusMessage icon={<ClipboardPaste />} title={m.lint_empty_title()}>
          {m.lint_empty_body()}
        </StatusMessage>
      )
    }
    if (lint.loadProblem === 'offline') {
      return (
        <StatusMessage
          role="alert"
          icon={<CloudOff />}
          title={m.trips_offline_title()}
          action={<RetryButton onClick={lint.refetch} />}
        >
          {m.trips_offline_body()}
        </StatusMessage>
      )
    }
    if (lint.loadProblem === 'not_found') {
      return (
        <StatusMessage icon={<KeyRound />} title={m.lint_gone_title()}>
          {m.lint_gone_body()}
        </StatusMessage>
      )
    }
    if (lint.loadProblem || lint.isFailed) {
      return (
        <StatusMessage
          role="alert"
          icon={<TriangleAlert />}
          title={m.lint_failed_title()}
          action={<RetryButton onClick={lint.isFailed ? openPaste : lint.refetch} />}
        >
          {lint.isFailed ? m.lint_failed_body() : m.lint_load_failed_body()}
        </StatusMessage>
      )
    }
    if (lint.isReading || !lint.paste?.report) {
      return (
        <div role="status" className="flex flex-col gap-3 py-4">
          <p className="text-sm">{m.lint_reading()}</p>
          {lint.percent !== null ? (
            <progress
              max={100}
              value={lint.percent}
              aria-label={m.lint_reading()}
              className="h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
            />
          ) : (
            <Skeleton aria-hidden="true" className="h-2 w-full" />
          )}
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-6" aria-busy={lint.choosingIndex !== null}>
        <LintCompare
          pasted={lint.paste.report.count}
          ours={hasNoPlan ? null : ours.report?.count}
        />
        {lint.chooseFailed && (
          <p role="alert" className="text-destructive text-sm">
            {m.lint_choose_failed()}
          </p>
        )}
        <UnrecognizedItems
          items={lint.paste.unrecognized}
          busyIndex={lint.choosingIndex}
          canChoose={canChoose}
          onChoose={lint.choose}
        />
        <RuleList report={lint.paste.report} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-20 md:pb-0">
      <div className="hidden justify-end md:flex">{pasteButton}</div>
      {body()}
      {/* Phones: the main action sits in a bar above the tab bar of the app shell. */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-background px-4 py-2 md:hidden">
        <Button onClick={openPaste} className="h-11 w-full">
          <ClipboardPaste />
          {pasteId ? m.lint_paste_again() : m.lint_paste_open()}
        </Button>
      </div>

      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        isDesktop={isDesktop}
        title={m.lint_paste_title()}
        description={m.lint_paste_description()}
      >
        <PasteForm
          text={text}
          onTextChange={setText}
          maxChars={PASTE_MAX_CHARS}
          isSubmitting={lint.isSubmitting}
          error={lint.submitFailure ? SUBMIT_FAILURE[lint.submitFailure]() : null}
          onSubmit={() => {
            lint.submit(text)
          }}
        />
      </ResponsiveModal>
    </div>
  )
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick}>
      {m.action_retry()}
    </Button>
  )
}
