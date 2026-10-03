import { type FormEvent, useState } from 'react'
import { CardChoice } from '@/components/interview/card-choice'
import { ChatThread } from '@/components/interview/chat-thread'
import { FactsPanel } from '@/components/interview/facts-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useInterview } from '@/hooks/use-interview'

const EXAMPLE = 'Gdańsk, trzy dni, dzieci 6 i 13 lat, babcia'

/** Spike: interview on our own components over @ag-ui/client (no CopilotKit). */
export function InterviewSpikeView() {
  const interview = useInterview()
  const [draft, setDraft] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || interview.running) return
    setDraft('')
    void interview.send(text)
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-4">
        <h1 className="font-semibold text-xl">Wywiad (AG-UI, własne komponenty)</h1>
        <ChatThread lines={interview.lines} />
        {interview.state.card && (
          <CardChoice
            card={interview.state.card}
            disabled={interview.running}
            onAnswer={(answer) => void interview.answerCard(answer)}
          />
        )}
        {interview.running && <p className="text-muted-foreground text-sm">Asystent myśli…</p>}
        {interview.error && (
          <div role="alert" className="flex items-center gap-3 text-destructive text-sm">
            {interview.error}
            <Button variant="outline" onClick={() => void interview.retry()}>
              Spróbuj ponownie
            </Button>
          </div>
        )}
        <form onSubmit={submit} className="flex gap-2">
          <Input
            className="h-11"
            value={draft}
            placeholder={EXAMPLE}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Twoja wiadomość"
          />
          <Button type="submit" className="h-11" disabled={interview.running}>
            Wyślij
          </Button>
        </form>
        {interview.firstCardMs !== null && (
          <p data-testid="first-card-ms" className="text-muted-foreground text-xs">
            Pierwsza karta po {interview.firstCardMs} ms
          </p>
        )}
      </div>
      <FactsPanel
        facts={interview.state.facts}
        onEdit={interview.editFact}
        onRemove={interview.removeFact}
      />
    </div>
  )
}
