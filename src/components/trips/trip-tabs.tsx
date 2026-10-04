import { Calendar, MessageSquare, UserCheck, Users } from '@keyline-icons/react'
import type { ReactNode } from 'react'
import { StatusMessage } from '@/components/shared/status-message'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TRIP_TABS, type TripTab } from '@/lib/trip-tabs'
import { m } from '@/paraglide/messages'

const TAB_LABELS: Record<TripTab, () => string> = {
  interview: m.trip_tab_interview,
  people: m.trip_tab_people,
  members: m.trip_tab_members,
  plan: m.trip_tab_plan,
}

const TAB_ICONS: Record<TripTab, ReactNode> = {
  interview: <MessageSquare />,
  people: <Users />,
  members: <UserCheck />,
  plan: <Calendar />,
}

interface TripTabsProps {
  tab: TripTab
  onTabChange: (tab: TripTab) => void
  /** The content of the Osoby tab: a view, so this component stays free of the data layer. */
  people: ReactNode
  /** The content of the Członkowie tab: a view, so this component stays free of the data layer. */
  members: ReactNode
  /** The content of the Plan tab: a view, so this component stays free of the data layer. */
  plan: ReactNode
}

/** Wywiad, Osoby, Członkowie, Plan: a four-segment switch. The Interview panel is a placeholder for the next issue. */
export function TripTabs({ tab, onTabChange, people, members, plan }: TripTabsProps) {
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        const next = TRIP_TABS.find((candidate) => candidate === value)
        if (next) onTabChange(next)
      }}
    >
      <TabsList aria-label={m.trip_tabs_label()} className="md:max-w-xl print:hidden">
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
      <TabsContent value="people">{people}</TabsContent>
      <TabsContent value="members">{members}</TabsContent>
      <TabsContent value="plan">{plan}</TabsContent>
    </Tabs>
  )
}
