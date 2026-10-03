import { Bike, Car, Route, Train } from '@keyline-icons/react'
import type { ReactNode } from 'react'
import type { PlanStop } from '@/api/queries/plans'
import { formatDecimal } from '@/lib/format'
import { m } from '@/paraglide/messages'

type Transfer = NonNullable<PlanStop['transfer']>

const MODE_LABELS: Record<Transfer['mode'], () => string> = {
  walk: m.plan_transfer_walk,
  transit: m.plan_transfer_transit,
  car: m.plan_transfer_car,
  bike: m.plan_transfer_bike,
}

// Keyline has no walking figure; the route glyph stands for "on foot".
const MODE_ICONS: Record<Transfer['mode'], ReactNode> = {
  walk: <Route />,
  transit: <Train />,
  car: <Car />,
  bike: <Bike />,
}

interface TransferRowProps {
  transfer: Transfer
  currency: string
}

/** The leg to a stop: how, how long and, when the data has it, what the ticket costs. */
export function TransferRow({ transfer, currency }: TransferRowProps) {
  return (
    <p className="flex items-center gap-2 text-muted-foreground text-sm leading-[22px]">
      <span aria-hidden="true" className="[&_svg]:size-4">
        {MODE_ICONS[transfer.mode]}
      </span>
      <span>
        {transfer.cost != null
          ? m.plan_transfer_line_cost({
              mode: MODE_LABELS[transfer.mode](),
              minutes: transfer.minutes,
              cost: formatDecimal(transfer.cost, currency),
            })
          : m.plan_transfer_line({ mode: MODE_LABELS[transfer.mode](), minutes: transfer.minutes })}
      </span>
    </p>
  )
}
