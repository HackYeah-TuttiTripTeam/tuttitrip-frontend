import { Mic, Sparkles } from '@keyline-icons/react'
import { useEffect, useRef, useState } from 'react'
import { BuildPlanButton } from '@/components/interview/build-plan-button'
import { ChatThread } from '@/components/interview/chat-thread'
import { Composer } from '@/components/interview/composer'
import { FirstSentenceInput } from '@/components/interview/first-sentence-input'
import { InterviewCard } from '@/components/interview/interview-card'
import { KnowledgePanel } from '@/components/interview/knowledge-panel'
import { LiveCaptions } from '@/components/interview/live-captions'
import { ResumeHeader } from '@/components/interview/resume-header'
import { VoiceControls } from '@/components/interview/voice-controls'
import { EditPersonForm } from '@/components/profiles/person-form'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { StatusMessage } from '@/components/shared/status-message'
import { TripForm } from '@/components/trips/trip-form'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCities } from '@/hooks/use-cities'
import { useCitySearch } from '@/hooks/use-city-search'
import { type DraftPlanError, useBuildPlanNow } from '@/hooks/use-draft-plan'
import { type InterviewError, useInterview } from '@/hooks/use-interview'
import { useInterviewSession } from '@/hooks/use-interview-session'
import { useKnowledge } from '@/hooks/use-knowledge'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useProfileActions } from '@/hooks/use-profile-actions'
import { useSaveTrip } from '@/hooks/use-save-trip'
import { useSession } from '@/hooks/use-session'
import { useVoiceCall, type VoiceProblem } from '@/hooks/use-voice-call'
import { useVoiceCard } from '@/hooks/use-voice-card'
import { collectedCount, resumeSummary } from '@/lib/interview'
import { VOICE_KNOWLEDGE_POLL_MS } from '@/lib/interview-constants'
import { prefersReducedMotion } from '@/lib/motion'
import { tripToFormValues } from '@/lib/trip-form'
import { cn } from '@/lib/utils'
import { visibleCaptions } from '@/lib/voice-events'
import { m } from '@/paraglide/messages'

const ERROR_TEXT: Record<InterviewError, () => string> = {
  auth: m.interview_error_auth,
  forbidden: m.interview_error_forbidden,
  busy: m.interview_error_busy,
  session: m.interview_error_session,
  offline: m.interview_error_offline,
  spend_limit: m.interview_error_spend_limit,
  timeout: m.interview_error_timeout,
  unavailable: m.interview_error_unavailable,
  failed: m.interview_error_failed,
}

const VOICE_PROBLEM_TEXT: Record<VoiceProblem, () => string> = {
  unsupported: m.interview_voice_problem_unsupported,
  denied: m.interview_voice_problem_denied,
  busy: m.interview_voice_problem_busy,
  budget: m.interview_voice_problem_budget,
  unavailable: m.interview_voice_problem_unavailable,
  auth: m.interview_voice_problem_auth,
  failed: m.interview_voice_problem_failed,
}

const BUILD_ERROR_TEXT: Record<DraftPlanError, () => string> = {
  no_city: m.interview_build_error_no_city,
  forbidden: m.interview_build_error_forbidden,
  offline: m.interview_build_error_offline,
  failed: m.interview_build_error_failed,
}

type Editing = { kind: 'trip' } | { kind: 'person'; id: string } | null

interface TripInterviewViewProps {
  tripId: string
  /** Host and co-host talk to the assistant; a plain member only reads the trip. */
  canManage: boolean
  /** Opens the person's preferences in the Osoby tab. */
  onOpenPerson: (profileId: string) => void
  /** "Build plan now" succeeded: the Plan tab shows the preliminary plan. */
  onPlanBuilt: () => void
  /** The trip was just created by voice (`?voice=1`): start the call, or ask for the tap that may. */
  startVoice?: boolean
  /** The start request was taken over; the view drops the param so a reload does not repeat it. */
  onVoiceHandled?: () => void
}

/**
 * The Wywiad tab. Named `trip-view.interview` because a view may only import views of its own
 * name (rule 1); TripView renders it. Desktop: the conversation and "What I know" side by side.
 * Phone: the conversation, and the panel in a drawer opened from the bottom bar.
 */
export function TripInterviewView({
  tripId,
  canManage,
  onOpenPerson,
  onPlanBuilt,
  startVoice = false,
  onVoiceHandled,
}: TripInterviewViewProps) {
  if (!canManage) {
    return (
      <StatusMessage icon={<Sparkles />} title={m.interview_members_title()}>
        {m.interview_members_body()}
      </StatusMessage>
    )
  }
  return (
    <InterviewWorkspace
      tripId={tripId}
      onOpenPerson={onOpenPerson}
      onPlanBuilt={onPlanBuilt}
      startVoice={startVoice}
      onVoiceHandled={onVoiceHandled}
    />
  )
}

function InterviewWorkspace({
  tripId,
  onOpenPerson,
  onPlanBuilt,
  startVoice,
  onVoiceHandled,
}: {
  tripId: string
  onOpenPerson: (profileId: string) => void
  onPlanBuilt: () => void
  startVoice: boolean
  onVoiceHandled?: () => void
}) {
  const session = useSession()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const history = useInterviewSession(tripId, session.status)
  const refreshKnowledge = useRef<() => unknown>(() => undefined)
  const voice = useVoiceCall({
    tripId,
    startSession: history.startSession,
    onEnded: () => void refreshKnowledge.current(),
    onToolFinished: () => void refreshKnowledge.current(),
  })
  // While the call runs the panel asks the API, because the tools save data without a snapshot.
  const knowledge = useKnowledge(
    tripId,
    session.status,
    voice.active ? VOICE_KNOWLEDGE_POLL_MS : undefined,
  )
  refreshKnowledge.current = knowledge.refresh
  const interview = useInterview({
    tripId,
    threadId: history.threadId,
    startSession: history.startSession,
    onKnowledge: knowledge.applySnapshot,
    onRunEnd: knowledge.refresh,
  })
  const busyText = interview.error === 'busy'
  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshBusy is stable per trip
  useEffect(() => {
    if (busyText) void voice.refreshBusy()
  }, [busyText])

  // The plan is built from what the trip holds, so it waits until the assistant (or the call) has
  // finished writing: a half-saved answer would be missing from it.
  const build = useBuildPlanNow({
    tripId,
    busy: interview.running || voice.active,
    onBuilt: onPlanBuilt,
  })
  const { cities } = useCities(session.status)
  const citySearch = useCitySearch(session.status)
  const voiceCard = useVoiceCard({
    tripId,
    callId: voice.callId,
    speechStarts: voice.speechStarts,
    send: voice.sendText,
  })
  const saveTrip = useSaveTrip(knowledge.knowledge?.trip ?? null, cities)
  const profileActions = useProfileActions(tripId)
  const [editing, setEditing] = useState<Editing>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  // After "create by voice": the click that made the trip may still count as a gesture and start
  // the call; if the browser says it no longer does, a big button waits for the tap.
  const [voicePrompt, setVoicePrompt] = useState(false)
  const voiceHandled = useRef(false)
  const { start: startCall } = voice
  useEffect(() => {
    if (!startVoice || voiceHandled.current || history.isPending) return
    voiceHandled.current = true
    onVoiceHandled?.()
    if (navigator.userActivation?.isActive) void startCall()
    else setVoicePrompt(true)
  }, [startVoice, history.isPending, onVoiceHandled, startCall])

  const lines = [...history.history, ...interview.lines]
  const lastLine = lines.at(-1)
  const streamed = lastLine?.role === 'assistant' ? lastLine.text.length : 0

  // The newest message and a new card come into view; reduced motion jumps instead of gliding.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the scroll follows the stream, not the refs
  useEffect(() => {
    end.current?.scrollIntoView?.({
      block: 'end',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [lines.length, streamed, interview.card])

  if (history.isPending) return <InterviewSkeleton />

  if (history.error) {
    return (
      <StatusMessage
        role="alert"
        icon={<Sparkles />}
        title={m.interview_load_failed_title()}
        action={
          <Button variant="outline" onClick={history.refetch}>
            {m.action_retry()}
          </Button>
        }
      >
        {m.interview_load_failed_body()}
      </StatusMessage>
    )
  }

  const started = lines.length > 0 || interview.running || voice.captions.length > 0
  // Back to a conversation from an earlier visit: say where it stood, until the host writes again.
  const resume =
    history.history.length > 0 && interview.lines.length === 0 && knowledge.knowledge
      ? resumeSummary(knowledge.knowledge)
      : null
  const collected = collectedCount(knowledge.knowledge)
  const closeEditing = () => setEditing(null)
  const editedProfile =
    editing?.kind === 'person'
      ? knowledge.knowledge?.people.find((person) => person.id === editing.id)
      : undefined

  const panel = (
    <KnowledgePanel
      knowledge={knowledge.knowledge}
      isPending={knowledge.isPending}
      failed={knowledge.problem !== null}
      locked={interview.running}
      onRetry={knowledge.refetch}
      onEditTrip={() => {
        setPanelOpen(false)
        setEditing({ kind: 'trip' })
      }}
      onEditPerson={(id) => {
        setPanelOpen(false)
        setEditing({ kind: 'person', id })
      }}
      onOpenPreferences={onOpenPerson}
    />
  )

  const buildButton = (
    <BuildPlanButton
      pending={build.isPending}
      waiting={build.waiting}
      onClick={build.build}
      className="flex-1 md:flex-none"
    />
  )

  const panelButton = (
    <Button
      type="button"
      variant="outline"
      className="h-11 shrink-0 rounded-full md:hidden"
      onClick={() => setPanelOpen(true)}
    >
      {m.interview_panel_open({ count: collected })}
    </Button>
  )

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-6">
        {resume && (resume.known.length > 0 || resume.missing.length > 0) && (
          <ResumeHeader summary={resume} />
        )}
        {started ? (
          <ChatThread
            lines={lines}
            hasEarlier={history.hasEarlier}
            loadingEarlier={history.loadingEarlier}
            onLoadEarlier={history.loadEarlier}
            waiting={interview.running && lastLine?.role !== 'assistant'}
            reasoning={interview.view.reasoning}
            working={interview.running && interview.view.tools.some((tool) => !tool.done)}
          />
        ) : (
          <FirstSentenceInput
            disabled={interview.running || voice.active}
            onSubmit={interview.send}
          />
        )}

        <section className="flex flex-col gap-3">
          {voicePrompt && !voice.active && (
            <div className="flex flex-col items-start gap-3 rounded-lg border p-4">
              <p className="text-sm">{m.interview_voice_begin_body()}</p>
              <Button
                type="button"
                size="lg"
                className="h-14 w-full text-base sm:w-auto"
                onClick={() => {
                  setVoicePrompt(false)
                  void voice.start()
                }}
              >
                <Mic aria-hidden="true" />
                {m.interview_voice_begin()}
              </Button>
            </div>
          )}
          <VoiceControls
            status={voice.status}
            activity={voice.activity}
            toolName={voice.toolName}
            saved={voice.saved && { name: voice.saved.name, ok: voice.saved.status === 'done' }}
            mode={voice.mode}
            held={voice.held}
            micMuted={voice.micMuted}
            canOverride={voice.canOverride}
            disabled={interview.running}
            onStart={() => void voice.start()}
            onStop={() => void voice.stop()}
            onModeChange={voice.setMode}
            onPressStart={voice.pressStart}
            onPressEnd={voice.pressEnd}
            onSpeakAnyway={voice.speakAnyway}
          />
          {voice.elsewhere && (
            <div
              role="alert"
              className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 p-4 text-sm"
            >
              <p>
                {voice.elsewhere === 'voice' ? m.voice_elsewhere_voice() : m.voice_elsewhere_text()}
              </p>
              {voice.elsewhere === 'voice' && (
                <Button className="h-11" onClick={() => void voice.takeOver()}>
                  {m.voice_elsewhere_end()}
                </Button>
              )}
            </div>
          )}
          {voice.problem && !(voice.problem === 'busy' && voice.elsewhere) && (
            <div
              role="alert"
              className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 p-4 text-sm"
            >
              <p>{VOICE_PROBLEM_TEXT[voice.problem]()}</p>
              {voice.problem === 'auth' && (
                <Button className="h-11" onClick={session.login}>
                  {m.interview_login_again()}
                </Button>
              )}
            </div>
          )}
          {(voice.active || voice.captions.length > 0) && (
            <LiveCaptions captions={visibleCaptions(voice.captions)} showNotice />
          )}
          {voice.active && voiceCard.card && (
            <section aria-label={m.interview_voice_card_label()}>
              <InterviewCard
                // A new question is a new card: its draft answer starts empty.
                key={`${voiceCard.card.kind}:${voiceCard.card.question}`}
                card={voiceCard.card}
                disabled={false}
                citySearch={citySearch}
                onAnswer={voiceCard.answer}
              />
            </section>
          )}
          {voice.status === 'ended' && !voice.problem && (
            <p role="status" className="text-muted-foreground text-sm">
              {m.interview_voice_ended()}
            </p>
          )}
        </section>

        {interview.error && (
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 p-4 text-sm"
          >
            <p>{ERROR_TEXT[interview.error]()}</p>
            {interview.error === 'auth' ? (
              <Button className="h-11" onClick={session.login}>
                {m.interview_login_again()}
              </Button>
            ) : (
              interview.canRetry && (
                <Button variant="outline" className="h-11" onClick={() => void interview.retry()}>
                  {m.action_retry()}
                </Button>
              )
            )}
          </div>
        )}

        {interview.card && (
          <InterviewCard
            // A new question is a new card: its draft answer starts empty.
            key={`${lines.length}:${interview.card.kind}:${interview.card.question}`}
            card={interview.card}
            disabled={interview.running}
            citySearch={citySearch}
            onAnswer={(answer) => void interview.answerCard(answer)}
          />
        )}
        <div ref={end} />

        {build.error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 p-4 text-sm leading-relaxed"
          >
            {BUILD_ERROR_TEXT[build.error]()}
          </div>
        )}

        <div
          className={cn(
            'sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 -mx-4 flex flex-col gap-3 border-t bg-background px-4 py-3 md:bottom-0 md:mx-0 md:border-t-0 md:px-0 md:py-0 md:pb-3',
            // Before the first sentence the bar holds only the phone buttons.
            !started && 'md:hidden',
          )}
        >
          <div className="flex items-center gap-2 md:hidden">
            {buildButton}
            {!started && panelButton}
          </div>
          {started && (
            <Composer
              disabled={interview.running || voice.active}
              onSend={(text) => void interview.send(text)}
            >
              {panelButton}
            </Composer>
          )}
        </div>
      </div>

      <aside
        aria-label={m.interview_panel_title()}
        className="hidden md:block md:sticky md:top-20 md:self-start"
      >
        <h2 className="mb-3 font-medium text-base">{m.interview_panel_title()}</h2>
        {panel}
        <div className="mt-5 flex flex-col items-start gap-2 border-t pt-5">
          {buildButton}
          <p className="text-muted-foreground text-xs leading-relaxed">
            {m.interview_build_hint()}
          </p>
        </div>
      </aside>

      <ResponsiveModal
        open={panelOpen && !isDesktop}
        onOpenChange={setPanelOpen}
        isDesktop={false}
        title={m.interview_panel_title()}
        description={m.interview_panel_description()}
      >
        <div className="pb-6">{panel}</div>
      </ResponsiveModal>

      <ResponsiveModal
        open={editing?.kind === 'trip' && knowledge.knowledge !== undefined}
        onOpenChange={(open) => {
          if (open) return
          closeEditing()
          saveTrip.reset()
        }}
        isDesktop={isDesktop}
        wide
        title={m.interview_trip_edit_title()}
        description={m.interview_trip_edit_description()}
      >
        {knowledge.knowledge && (
          <TripForm
            initial={tripToFormValues(knowledge.knowledge.trip)}
            tripCurrency={knowledge.knowledge.trip.currency}
            cities={cities}
            citySearch={citySearch}
            fieldErrors={saveTrip.fieldErrors}
            submitError={saveTrip.submitError}
            isSubmitting={saveTrip.isPending}
            submitLabel={m.trip_settings_save()}
            submittingLabel={m.trip_settings_saving()}
            onSubmit={async (values) => {
              if (await saveTrip.submit(values)) {
                await knowledge.refresh()
                closeEditing()
              }
            }}
          />
        )}
      </ResponsiveModal>

      <ResponsiveModal
        open={editedProfile !== undefined}
        onOpenChange={(open) => !open && closeEditing()}
        isDesktop={isDesktop}
        title={m.people_form_edit_title({ name: editedProfile?.display_name ?? '' })}
        description={m.people_form_edit_description()}
      >
        {editedProfile && (
          <EditPersonForm
            key={editedProfile.id}
            profile={editedProfile}
            onSubmit={async (values) => {
              const result = await profileActions.edit(editedProfile, values)
              if (result.ok) {
                await knowledge.refresh()
                closeEditing()
              }
              return result
            }}
          />
        )}
      </ResponsiveModal>
    </div>
  )
}

function InterviewSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-11 w-40 rounded-full" />
    </div>
  )
}
