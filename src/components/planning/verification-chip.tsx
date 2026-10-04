import { ShieldCheck, ShieldQuestion } from '@keyline-icons/react'
import { cn } from 'cn'
import { externalLink } from '@/lib/external-link'
import { formatDayMonth } from '@/lib/format'
import { m } from '@/paraglide/messages'

const LABELS = {
  price: { verified: m.plan_price_verified, unverified: m.plan_price_unverified },
  hours: { verified: m.plan_hours_verified, unverified: m.plan_hours_unverified },
} as const

/** "Verified, 12 Sep" / "Not verified": the words of the chip, also used by the printout. */
export function verificationText(
  kind: 'price' | 'hours',
  verified: boolean,
  verifiedAt?: string | null,
): string {
  const label = LABELS[kind][verified ? 'verified' : 'unverified']()
  return verified && verifiedAt
    ? m.plan_verified_on({ label, date: formatDayMonth(verifiedAt) })
    : label
}

/** Only http(s) links are shown; the hostname is the part a reader can judge. */
export function parseSource(url: string | null | undefined): URL | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed : null
  } catch {
    return null
  }
}

interface VerificationChipProps {
  kind: 'price' | 'hours'
  verified: boolean
  verifiedAt?: string | null
  sourceUrl?: string | null
}

/**
 * Solid = a checked fact (shield with a tick, date of the check), dashed and quieter = not
 * confirmed. The word carries the meaning, the line and the icon only back it up.
 */
export function VerificationChip({ kind, verified, verifiedAt, sourceUrl }: VerificationChipProps) {
  const text = verificationText(kind, verified, verifiedAt)
  const source = parseSource(sourceUrl)
  const host = source?.hostname.replace(/^www\./, '')

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span
        className={cn(
          'inline-flex min-h-7 items-center gap-1.5 rounded-full py-0.5 pr-3 pl-2.5 font-medium text-[13px] leading-[18px]',
          verified
            ? 'bg-secondary text-foreground'
            : 'border-[1.5px] border-muted-foreground border-dashed text-muted-foreground',
        )}
      >
        {verified ? (
          <ShieldCheck aria-hidden="true" className="size-4" />
        ) : (
          <ShieldQuestion aria-hidden="true" className="size-4" />
        )}
        {text}
      </span>
      {source && host && (
        <a
          href={source.href}
          {...externalLink}
          aria-label={m.plan_source_opens({ host })}
          className="rounded-sm text-[13px] text-muted-foreground leading-[18px] underline underline-offset-2 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {m.plan_source({ host })}
        </a>
      )}
    </span>
  )
}
