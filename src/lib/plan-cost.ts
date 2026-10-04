import type { PlanDay, PlanStop, TransitTicket } from '@/api/queries/plans'

const CENTS = 100

const toCents = (amount: string) => Math.round(Number(amount) * CENTS)
const fromCents = (cents: number) => (cents / CENTS).toFixed(2)

/** Sums decimal money strings in whole cents, so no float error creeps in. */
export function sumDecimals(amounts: string[]): string {
  return fromCents(amounts.reduce((total, amount) => total + toCents(amount), 0))
}

/** What the whole group pays at a stop: the people's lines when the API gives them, else the price per person times the group. */
export function stopGroupCost(stop: PlanStop, groupSize: number): string | null {
  if (stop.price_lines && stop.price_lines.length > 0)
    return sumDecimals(stop.price_lines.map((line) => line.price))
  return stop.cost_per_person == null
    ? null
    : fromCents(toCents(stop.cost_per_person) * Math.max(1, groupSize))
}

/** The day's cost for the group, or null when no stop of the day has a price. */
export function dayCost(day: PlanDay, groupSize: number): string | null {
  const costs = day.items.map((stop) => stopGroupCost(stop, groupSize)).filter((c) => c !== null)
  return costs.length > 0 ? sumDecimals(costs) : null
}

/** The tickets for one day: information only, never in the budget. */
export const dayTickets = (tickets: TransitTicket[] | undefined, day: number): TransitTicket[] =>
  (tickets ?? []).filter((ticket) => ticket.day === day)

/** How much the family ticket saves against single tickets, or null when it does not. */
export function familySaving(stop: PlanStop): string | null {
  const family = stop.family_ticket
  if (!family) return null
  const saving = toCents(family.singles_total) - toCents(family.total)
  return saving > 0 ? fromCents(saving) : null
}
