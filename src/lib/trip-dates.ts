/** True once the day after the last day of the trip has begun (local time); no end date: never. */
export function tripHasEnded(endDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!endDate) return false
  const [year = 0, month = 1, day = 1] = endDate.split('-').map(Number)
  return now >= new Date(year, month - 1, day + 1)
}
