import type { DecisionEffects, OverrideKind } from '@/api/queries/decisions'
import { ApprovalCard, type ApprovalFact } from '@/components/shared/approval-card'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatSigned, formatSignedDecimal, formatSignedMinutes } from '@/lib/format'
import { OVERRIDE_REASON_MAX_CHARS } from '@/lib/verdicts'
import { m } from '@/paraglide/messages'
import { PersonDeltas } from './decision-effects'

interface OverrideDialogProps {
  /** The place and the decision; null keeps the dialog closed. */
  target: { placeName: string; kind: OverrideKind } | null
  isDesktop: boolean
  currency: string
  /** The cost of the decision as the server computed it; undefined while it is being computed. */
  effects: DecisionEffects | undefined
  previewPending: boolean
  names: ReadonlyMap<string, string>
  reason: string
  applyPending: boolean
  /** A message for a failed preview or save; null when all is well. */
  error: string | null
  /** Reasons the server gave for a 409, already in words. */
  conflicts: string[]
  onKindChange: (kind: OverrideKind) => void
  onReasonChange: (reason: string) => void
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Force a place or block it, with the price shown before the host confirms: the change of `min r`
 * and Jain's index, the budget and the time. Nothing is saved until "Zatwierdź".
 */
export function OverrideDialog({
  target,
  isDesktop,
  currency,
  effects,
  previewPending,
  names,
  reason,
  applyPending,
  error,
  conflicts,
  onKindChange,
  onReasonChange,
  onConfirm,
  onCancel,
}: OverrideDialogProps) {
  const facts: ApprovalFact[] = effects
    ? [
        { label: m.override_min_r(), value: formatSigned(effects.d_min_r), mono: true },
        {
          label: m.override_budget(),
          value: formatSignedDecimal(effects.d_cost, currency),
          mono: true,
        },
        { label: m.override_time(), value: formatSignedMinutes(effects.d_minutes), mono: true },
      ]
    : []

  return (
    <ResponsiveModal
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !applyPending) onCancel()
      }}
      isDesktop={isDesktop}
      title={target ? m.override_title({ place: target.placeName }) : ''}
      description={m.override_description()}
    >
      {target && (
        <div className="flex flex-col gap-4">
          <ToggleGroup
            type="single"
            value={target.kind}
            aria-label={m.override_kind_label()}
            onValueChange={(value) => {
              if (value === 'must' || value === 'block') onKindChange(value)
            }}
          >
            <ToggleGroupItem value="must">{m.override_kind_must()}</ToggleGroupItem>
            <ToggleGroupItem value="block">{m.override_kind_block()}</ToggleGroupItem>
          </ToggleGroup>

          <div aria-live="polite" aria-busy={previewPending}>
            {previewPending && (
              <p className="text-muted-foreground text-sm">{m.override_computing()}</p>
            )}
          </div>

          <ApprovalCard
            facts={facts}
            approve={
              effects ? [{ key: 'confirm', label: m.override_confirm(), onClick: onConfirm }] : []
            }
            rejectLabel={m.override_cancel()}
            onReject={onCancel}
            busy={applyPending}
            error={error}
          >
            {conflicts.length > 0 && (
              <ul className="list-disc pl-5 text-destructive text-sm leading-relaxed">
                {conflicts.map((conflict) => (
                  <li key={conflict}>{conflict}</li>
                ))}
              </ul>
            )}
            {effects && <PersonDeltas effects={effects} names={names} />}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="override-reason">{m.override_reason_label()}</Label>
              <Textarea
                id="override-reason"
                value={reason}
                maxLength={OVERRIDE_REASON_MAX_CHARS}
                placeholder={m.override_reason_placeholder()}
                onChange={(event) => onReasonChange(event.target.value)}
              />
            </div>
          </ApprovalCard>
        </div>
      )}
    </ResponsiveModal>
  )
}
