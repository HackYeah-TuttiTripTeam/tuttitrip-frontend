import { Ban } from '@keyline-icons/react'
import { useState } from 'react'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { m } from '@/paraglide/messages'

export type VetoProgress = 'idle' | 'saving' | 'recalculating' | 'not_recalculated' | 'failed'

interface VetoButtonProps {
  placeName: string
  /** Who the veto can be filed for. One person: that person is the author, no choice is shown. */
  people: { id: string; name: string }[]
  /** The person preselected: the caller's own profile. */
  defaultPersonId: string
  /** Dialog on desktop, drawer on phones. */
  isDesktop: boolean
  progress: VetoProgress
  onVeto: (profileId: string) => void
  onRetry: () => void
}

/**
 * The veto of one place: a hard block that takes it out of the plan for the whole group. The host
 * files it for another person ("on behalf"). It asks first, because it changes the plan. When the
 * veto is saved but the plan could not be recalculated, it says so and offers a retry.
 */
export function VetoButton({
  placeName,
  people,
  defaultPersonId,
  isDesktop,
  progress,
  onVeto,
  onRetry,
}: VetoButtonProps) {
  const [open, setOpen] = useState(false)
  const [personId, setPersonId] = useState(defaultPersonId)
  const busy = progress === 'saving' || progress === 'recalculating'

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-fit rounded-full px-4"
        disabled={busy}
        onClick={() => setOpen(true)}
      >
        <Ban aria-hidden="true" />
        {m.veto_open({ name: placeName })}
      </Button>
      {progress === 'recalculating' && (
        <p role="status" className="text-muted-foreground text-sm">
          {m.veto_recalculating()}
        </p>
      )}
      {progress === 'not_recalculated' && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-destructive">{m.veto_not_recalculated()}</span>
          <Button type="button" variant="outline" className="h-11 rounded-full" onClick={onRetry}>
            {m.veto_retry()}
          </Button>
        </div>
      )}
      {progress === 'failed' && (
        <p role="alert" className="text-destructive text-sm">
          {m.veto_failed()}
        </p>
      )}
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        isDesktop={isDesktop}
        title={m.veto_title({ name: placeName })}
        description={m.veto_description()}
      >
        <div className="flex flex-col gap-4 pb-4">
          {people.length > 1 && (
            <div className="flex flex-col gap-2">
              <p className="font-medium text-sm">{m.veto_on_behalf()}</p>
              <ToggleGroup
                type="single"
                aria-label={m.veto_on_behalf()}
                value={personId}
                className="flex flex-wrap rounded-3xl"
                onValueChange={(next) => next && setPersonId(next)}
              >
                {people.map((person) => (
                  <ToggleGroupItem key={person.id} value={person.id} className="px-4">
                    {person.name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}
          <Button
            type="button"
            className="h-11 rounded-full"
            onClick={() => {
              setOpen(false)
              onVeto(personId)
            }}
          >
            {m.veto_confirm()}
          </Button>
        </div>
      </ResponsiveModal>
    </div>
  )
}

interface VetoNoteProps {
  vetoes: { id: string; name: string; onBehalf: boolean }[]
}

/** "weto: Kasia, zgłosił host" under a place that still carries vetoes. */
export function VetoNote({ vetoes }: VetoNoteProps) {
  if (vetoes.length === 0) return null
  return (
    <ul className="flex flex-col gap-0.5">
      {vetoes.map((veto) => (
        <li key={veto.id} className="font-medium text-decline-ink text-sm leading-[22px]">
          {veto.onBehalf
            ? m.veto_note_on_behalf({ name: veto.name })
            : m.veto_note({ name: veto.name })}
        </li>
      ))}
    </ul>
  )
}
