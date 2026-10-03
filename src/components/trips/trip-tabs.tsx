import { Calendar, MessageSquare, Users } from '@keyline-icons/react'
import type { ReactNode } from 'react'
import type { Trip } from '@/api/queries/trips'
import { StatusMessage } from '@/components/shared/status-message'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TRIP_TABS, type TripTab } from '@/lib/trip-tabs'
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

/** Wywiad, Osoby, Plan: a three-segment switch. The panels are placeholders for the next issues. */
export function TripTabs({ tab, onTabChange, role }: TripTabsProps) {
  const canManage = role !== 'member'
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        const next = TRIP_TABS.find((candidate) => candidate === value)
        if (next) onTabChange(next)
      }}
    >
      <TabsList aria-label={m.trip_tabs_label()} className="md:max-w-md">
        {TRIP_TABS.map((value) => (
          <TabsTrigger key={value} value={value}>
            <span aria-hidden="true">{TAB_ICONS[value]}</span>
            <span className="truncate">{TAB_LABELS[value]()}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="interview">
        <StatusMessage icon={<MessageSquare />} title={m.trip_interview_title()}>
          {m.trip_interview_body()}
        </StatusMessage>
      </TabsContent>
      <TabsContent value="people">
        <StatusMessage icon={<Users />} title={m.trip_people_title()}>
          {canManage ? m.trip_people_body_manage() : m.trip_people_body_member()}
        </StatusMessage>
      </TabsContent>
      <TabsContent value="plan">
        <StatusMessage icon={<Calendar />} title={m.trip_plan_title()}>
          {m.trip_plan_body()}
        </StatusMessage>
      </TabsContent>
    </Tabs>
  )
}
