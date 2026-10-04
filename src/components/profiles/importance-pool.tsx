import { Minus, Plus } from '@keyline-icons/react'
import { cn } from 'cn'
import { type KeyboardEvent, useState } from 'react'
import type { ImportancePool as Pool } from '@/api/queries/preferences'
import { Button } from '@/components/ui/button'
import {
  forcedPlaces,
  POOL_DOMAINS,
  POOL_TOTAL,
  type PoolDomain,
  poolRemaining,
  samePool,
  stepPool,
} from '@/lib/importance'
import type { SaveResult } from '@/lib/people'
import { m } from '@/paraglide/messages'

const DOMAIN_LABELS: Record<PoolDomain, () => string> = {
  lodging: m.prefs_pool_domain_lodging,
  food: m.prefs_pool_domain_food,
  attractions: m.prefs_pool_domain_attractions,
  pace: m.prefs_pool_domain_pace,
  cost: m.prefs_pool_domain_cost,
}

/** Only these domains carry minimum tags (a cuisine, an attraction tag), so only they force places. */
const MIN_TAG_DOMAINS: readonly PoolDomain[] = ['food', 'attractions']

/** A filled dot is a solid disc, an empty one a ring: the count never depends on colour alone. */
function Dots({ points }: { points: number }) {
  return (
    <span aria-hidden="true" className="flex gap-1.5">
      {Array.from({ length: POOL_TOTAL }, (_, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: the dots are positions, not data
          key={index}
          className={cn(
            'size-4 shrink-0 rounded-full border-2',
            index < points ? 'border-primary bg-primary' : 'border-input bg-transparent',
          )}
        />
      ))}
    </span>
  )
}

function MinimumNote({ domain, points }: { domain: PoolDomain; points: number }) {
  const count = forcedPlaces(points)
  if (count === 0 || !MIN_TAG_DOMAINS.includes(domain)) return null
  return <p className="text-muted-foreground text-sm">{m.prefs_pool_min({ count })}</p>
}

interface ImportancePoolProps {
  /** The saved pool. */
  pool: Pool
  /** Nobody saved the preferences yet, so the pool is the age default. */
  isDefault: boolean
  readOnly?: boolean
  /** Saves the whole pool, only called when the draft adds up to the total. */
  onSave: (pool: Pool) => Promise<SaveResult>
}

/**
 * The ten dots over five domains. The draft may be short of the total while the person moves
 * points around; saving is possible only when none is left, so the API never gets a wrong sum.
 * Each row is a spin button: arrow keys move one point, Home takes all, End gives all that are free.
 */
export function ImportancePool({ pool, isDefault, readOnly = false, onSave }: ImportancePoolProps) {
  const [draft, setDraft] = useState<Pool | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shown = draft ?? pool

  if (readOnly) {
    return (
      <ul aria-label={m.prefs_pool_readonly_label()} className="flex max-w-md flex-col gap-3">
        {POOL_DOMAINS.map((domain) => (
          <li key={domain} className="flex flex-col gap-1">
            <span className="flex items-center justify-between gap-3">
              <span className="font-medium text-sm">{DOMAIN_LABELS[domain]()}</span>
              <Dots points={pool[domain]} />
            </span>
            <span className="sr-only">
              {m.prefs_pool_value({
                domain: DOMAIN_LABELS[domain](),
                points: pool[domain],
                total: POOL_TOTAL,
              })}
            </span>
            <MinimumNote domain={domain} points={pool[domain]} />
          </li>
        ))}
      </ul>
    )
  }

  const remaining = poolRemaining(shown)
  const dirty = draft !== null && !samePool(draft, pool)
  const canSave = dirty && remaining === 0 && !saving

  const move = (domain: PoolDomain, step: number) => {
    setError(null)
    setDraft(stepPool(shown, domain, step))
  }

  const onKey = (domain: PoolDomain, event: KeyboardEvent) => {
    const steps: Record<string, number> = {
      ArrowUp: 1,
      ArrowRight: 1,
      ArrowDown: -1,
      ArrowLeft: -1,
      Home: -POOL_TOTAL,
      End: POOL_TOTAL,
    }
    const step = steps[event.key]
    if (step === undefined) return
    event.preventDefault()
    move(domain, step)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    const result = await onSave(shown)
    setSaving(false)
    if (result.ok) setDraft(null)
    else setError(result.message)
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {POOL_DOMAINS.map((domain) => {
          const points = shown[domain]
          const label = DOMAIN_LABELS[domain]()
          return (
            <li key={domain} className="flex flex-col gap-1">
              <span className="flex items-center justify-between">
                <span aria-hidden="true" className="font-medium text-sm">
                  {label}
                </span>
                <span aria-hidden="true" className="text-muted-foreground text-sm tabular-nums">
                  {points}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  tabIndex={-1}
                  aria-label={m.prefs_pool_less({ domain: label })}
                  disabled={points === 0 || saving}
                  onClick={() => move(domain, -1)}
                  className="size-11 shrink-0 md:size-9"
                >
                  <Minus aria-hidden="true" />
                </Button>
                <div
                  role="spinbutton"
                  tabIndex={0}
                  aria-label={label}
                  aria-valuemin={0}
                  aria-valuemax={points + Math.max(0, remaining)}
                  aria-valuenow={points}
                  aria-valuetext={m.prefs_pool_value({ domain: label, points, total: POOL_TOTAL })}
                  onKeyDown={(event) => onKey(domain, event)}
                  className="flex h-11 flex-1 items-center justify-center rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:h-9"
                >
                  <Dots points={points} />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  tabIndex={-1}
                  aria-label={m.prefs_pool_more({ domain: label })}
                  disabled={remaining <= 0 || points === POOL_TOTAL || saving}
                  onClick={() => move(domain, 1)}
                  className="size-11 shrink-0 md:size-9"
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
              <MinimumNote domain={domain} points={points} />
            </li>
          )
        })}
      </ul>

      <div role="status" className="font-medium text-sm">
        {remaining === 0 ? m.prefs_pool_complete() : m.prefs_pool_remaining({ count: remaining })}
      </div>
      {isDefault && !dirty && (
        <p className="text-muted-foreground text-sm">{m.prefs_pool_default()}</p>
      )}
      {dirty && remaining > 0 && (
        <p className="text-muted-foreground text-sm">{m.prefs_pool_need_all()}</p>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {dirty && (
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => void save()} disabled={!canSave} className="h-11">
            {m.prefs_pool_save()}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDraft(null)
              setError(null)
            }}
            disabled={saving}
            className="h-11"
          >
            {m.prefs_pool_reset()}
          </Button>
        </div>
      )}
    </div>
  )
}
