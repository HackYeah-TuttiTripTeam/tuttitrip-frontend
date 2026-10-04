import type { ReactNode } from 'react'
import type { PlanDay } from '@/api/queries/plans'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDateRange } from '@/lib/format'
import { m } from '@/paraglide/messages'

interface DayTabsProps {
  days: PlanDay[]
  /** 1-based day number, the same as `PlanDay.index`. */
  value: number
  onValueChange: (index: number) => void
  renderDay: (day: PlanDay) => ReactNode
  /** Under the day's heading: the day's cost. */
  renderDayMeta?: (day: PlanDay) => ReactNode
}

/** Days as a scrollable segmented switch; the panel under it is the plan of the chosen day. */
export function DayTabs({ days, value, onValueChange, renderDay, renderDayMeta }: DayTabsProps) {
  return (
    <Tabs
      value={String(value)}
      onValueChange={(next) => {
        const day = days.find((candidate) => String(candidate.index) === next)
        if (day) onValueChange(day.index)
      }}
    >
      <TabsList
        aria-label={m.plan_days_label()}
        className="auto-cols-[minmax(max-content,1fr)] overflow-x-auto"
      >
        {days.map((day) => (
          <TabsTrigger key={day.index} value={String(day.index)} className="px-4">
            {m.plan_day_n({ n: day.index })}
          </TabsTrigger>
        ))}
      </TabsList>
      {days.map((day) => (
        <TabsContent key={day.index} value={String(day.index)} className="flex flex-col gap-4">
          <h2 className="font-heading font-semibold text-[22px] leading-7">
            {day.date
              ? m.plan_day_dated({ n: day.index, date: formatDateRange(day.date, null) ?? '' })
              : m.plan_day_n({ n: day.index })}
          </h2>
          {renderDayMeta?.(day)}
          {renderDay(day)}
        </TabsContent>
      ))}
    </Tabs>
  )
}
