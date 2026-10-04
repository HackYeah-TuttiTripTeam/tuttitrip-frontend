import { ChevronDown } from '@keyline-icons/react'
import { cn } from 'cn'
import { Fragment, useState } from 'react'
import type { PlanFairness } from '@/api/queries/plans'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { percentOf } from '@/lib/fairness'
import { formatFixed } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { DomainChart } from './domain-chart'

/** Columns of the ledger before the domains: name, u, u*, r, floor, own-place days, toggle. */
const COLUMNS = 7

/**
 * The host's ledger: for each person the welfare in the plan (`u`), what they would get alone
 * (`u*`), the share (`r`), the floor and the days with a place of their own; the domains open per
 * person. The API decides who gets this data; the screen only shows it.
 */
export function FairnessLedger({ fairness }: { fairness: PlanFairness }) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <section aria-labelledby="ledger-title" className="flex flex-col gap-2">
      <h3 id="ledger-title" className="font-heading font-semibold text-lg leading-6">
        {m.ledger_title()}
      </h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-card">{m.ledger_person()}</TableHead>
            <TableHead className="text-right">{m.ledger_u()}</TableHead>
            <TableHead className="text-right">{m.ledger_u_star()}</TableHead>
            <TableHead className="text-right">{m.ledger_r()}</TableHead>
            <TableHead className="text-right">{m.ledger_floor()}</TableHead>
            <TableHead className="text-right">{m.ledger_own_days()}</TableHead>
            <TableHead>
              <span className="sr-only">{m.ledger_domains()}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fairness.per_person.map((person) => {
            const expanded = open === person.profile_id
            return (
              <Fragment key={person.profile_id}>
                <TableRow>
                  <TableCell className="sticky left-0 bg-card font-medium">{person.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatFixed(person.u, 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatFixed(person.u_star, 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.fairness_percent({ pct: percentOf(person.r) })}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums',
                      !person.floor_met && 'text-decline-ink',
                    )}
                  >
                    {formatFixed(person.floor_eff, 0)}
                    {!person.floor_met && ` ${m.ledger_below()}`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{person.own_place_days}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 rounded-full"
                      aria-expanded={expanded}
                      aria-label={m.ledger_toggle({ name: person.name })}
                      onClick={() => setOpen(expanded ? null : person.profile_id)}
                    >
                      <ChevronDown
                        aria-hidden="true"
                        className={
                          expanded ? 'rotate-180 transition-transform' : 'transition-transform'
                        }
                      />
                    </Button>
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow>
                    <TableCell colSpan={COLUMNS} className="whitespace-normal">
                      <DomainChart domains={person.domains} weakest={person.weakest_domain} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
      <p className="text-muted-foreground text-sm leading-[22px]">{m.ledger_note()}</p>
    </section>
  )
}
