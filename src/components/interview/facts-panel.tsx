import type { InterviewFact } from '@/api/interview-agent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FactsPanelProps {
  facts: InterviewFact[]
  onEdit: (key: string, value: string) => void
  onRemove: (key: string) => void
}

/** "Co już wiem": the shared state, editable by the organizer. */
export function FactsPanel({ facts, onEdit, onRemove }: FactsPanelProps) {
  return (
    <section aria-labelledby="facts-title" className="flex flex-col gap-3">
      <h2 id="facts-title" className="font-medium text-base">
        Co już wiem
      </h2>
      {facts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Na razie nic. Opowiedz o wyjeździe jednym zdaniem.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {facts.map((fact) => (
            <li key={fact.key} className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor={`fact-${fact.key}`} className="text-muted-foreground text-xs">
                  {fact.label}
                </Label>
                <Input
                  id={`fact-${fact.key}`}
                  className="h-11 text-foreground text-sm"
                  value={fact.value}
                  onChange={(event) => onEdit(fact.key, event.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                className="h-11 min-w-11"
                aria-label={`Usuń: ${fact.label}`}
                onClick={() => onRemove(fact.key)}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
