import { Calendar, MessageSquare, Users } from '@keyline-icons/react'
import { Tabs } from 'radix-ui'
import type { ReactNode } from 'react'
import type { Trip } from '@/api/queries/trips'
import { StatusMessage } from '@/components/shared/status-message'
import { cn } from '@/lib/utils'
import type { TripTab } from '@/loaders/trip'
import { m } from '@/paraglide/messages'

const TAB_LABELS: Record<TripTab, () => string> = {
  interview: m.trip_tab_interview,
  people: m.trip_tab_people,
  plan: m.trip_tab_plan,
}

const TAB_ICONS: Record<TripTab, ReactNode> = {
  interview: <MessageSquare />,
  people: <Users />,
  plan: <Calendar />,
}

interface TripTabsProps {
  tab: TripTab
  onTabChange: (tab: TripTab) => void
  /** Decides which actions the panels offer; passed down so panels never read the API. */
  role: Trip['my_role']
}

const TABS = Object.keys(TAB_LABELS).filter(isTripTab)

function isTripTab(value: string): value is TripTab {
  return value in TAB_LABELS
}

/** Wywiad, Osoby, Plan: a three-segment switch, 44px tall, the active tab filled with ink. */
export function TripTabs({ tab, onTabChange, role }: TripTabsProps) {
  const canManage = role !== 'member'
  return (
    <Tabs.Root
      value={tab}
      onValueChange={(value) => isTripTab(value) && onTabChange(value)}
      className="flex flex-col gap-6"
    >
      <Tabs.List
        aria-label={m.trip_tabs_label()}
        className="grid grid-cols-3 gap-1 rounded-full border bg-muted p-1 md:max-w-md"
      >
        {TABS.map((value) => (
          <Tabs.Trigger
            key={value}
            value={value}
            className={cn(
              'inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full px-2 font-medium text-muted-foreground text-sm outline-none transition-colors',
              'hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'data-[state=active]:bg-foreground data-[state=active]:text-background',
              "[&_svg:not([class*='size-'])]:size-4",
            )}
          >
            <span aria-hidden="true">{TAB_ICONS[value]}</span>
            <span className="truncate">{TAB_LABELS[value]()}</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="interview" className="outline-none">
        <StatusMessage icon={<MessageSquare />} title={m.trip_interview_title()}>
          {m.trip_interview_body()}
        </StatusMessage>
      </Tabs.Content>
      <Tabs.Content value="people" className="outline-none">
        <StatusMessage icon={<Users />} title={m.trip_people_title()}>
          {canManage ? m.trip_people_body_manage() : m.trip_people_body_member()}
        </StatusMessage>
      </Tabs.Content>
      <Tabs.Content value="plan" className="outline-none">
        <StatusMessage icon={<Calendar />} title={m.trip_plan_title()}>
          {m.trip_plan_body()}
        </StatusMessage>
      </Tabs.Content>
    </Tabs.Root>
  )
}
