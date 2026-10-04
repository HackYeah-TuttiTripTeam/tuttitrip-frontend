import type { SearchLink, SearchLinks } from '@/api/queries/accommodation'
import { ApprovalCard, type ApprovalFact } from '@/components/shared/approval-card'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { Skeleton } from '@/components/ui/skeleton'
import { platformLabel } from '@/lib/accommodation'
import { formatDateRange, formatMoney } from '@/lib/format'
import { m } from '@/paraglide/messages'

interface SearchApprovalProps {
  open: boolean
  isDesktop: boolean
  links: SearchLinks | undefined
  isPending: boolean
  /** A message when the links could not be built (no dates, an outing, a network error). */
  error: string | null
  onOpen: (link: SearchLink) => void
  onCancel: () => void
}

/**
 * The approval card before a person leaves TuttiTrip for a lodging platform: the dates, the guests,
 * the area and the price ceiling the search will carry, and which of them the platform does not
 * document. Nothing opens until a platform button is pressed.
 */
export function SearchApproval({
  open,
  isDesktop,
  links,
  isPending,
  error,
  onOpen,
  onCancel,
}: SearchApprovalProps) {
  const unofficial = links
    ? [
        ...new Set(
          links.links.flatMap((link) =>
            link.params.filter((param) => !param.official).map((param) => param.name),
          ),
        ),
      ]
    : []
  const price = links?.price_per_night

  const facts: ApprovalFact[] = links
    ? [
        {
          label: m.search_dates(),
          value: m.search_dates_value({
            range: formatDateRange(links.check_in, links.check_out) ?? '',
            count: links.nights,
          }),
        },
        { label: m.search_adults(), value: String(links.adults), mono: true },
        ...(links.child_ages.length > 0
          ? [
              {
                label: m.search_children(),
                value: m.search_children_value({ ages: links.child_ages.join(', ') }),
              },
            ]
          : []),
        { label: m.search_area(), value: links.area ?? m.search_area_none() },
        {
          label: m.search_price(),
          value: price ? formatMoney(price.amount, price.currency) : m.search_price_none(),
          mono: price != null,
        },
      ]
    : []

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
      isDesktop={isDesktop}
      title={m.search_title()}
      description={m.search_description()}
    >
      {isPending ? (
        <div aria-hidden="true" className="flex flex-col gap-3 pb-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : links ? (
        <ApprovalCard
          facts={facts}
          approve={links.links.map((link) => ({
            key: link.platform,
            label: m.search_open({ platform: platformLabel(link.platform) }),
            onClick: () => onOpen(link),
          }))}
          rejectLabel={m.search_cancel()}
          onReject={onCancel}
        >
          {price && (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {price.basis === 'budget_day_max'
                ? m.search_price_basis_day()
                : m.search_price_basis_total()}
            </p>
          )}
          <p className="text-sm leading-relaxed">
            {m.search_platforms({
              platforms: links.links.map((link) => platformLabel(link.platform)).join(', '),
            })}
            {links.platforms_restricted && ` ${m.search_platforms_restricted()}`}
          </p>
          {unofficial.length > 0 && (
            <p className="rounded-lg bg-muted px-4 py-3 text-sm leading-relaxed">
              {m.search_unofficial({ names: unofficial.join(', ') })}
            </p>
          )}
          <p className="text-muted-foreground text-xs leading-relaxed">{m.search_no_booking()}</p>
        </ApprovalCard>
      ) : (
        <p role="alert" className="pb-4 text-destructive text-sm">
          {error ?? m.search_failed()}
        </p>
      )}
    </ResponsiveModal>
  )
}
