import {
  Calendar,
  Images,
  MessageSquare,
  Navigation,
  UserCheck,
  Users,
  Wallet,
} from '@keyline-icons/react'
import type { ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TOUR } from '@/lib/help'
import { TRIP_TABS, type TripTab } from '@/lib/trip-tabs'
import { m } from '@/paraglide/messages'

const TAB_LABELS: Record<TripTab, () => string> = {
  interview: m.trip_tab_interview,
  people: m.trip_tab_people,
  members: m.trip_tab_members,
  plan: m.trip_tab_plan,
  photos: m.trip_tab_photos,
  locations: m.trip_tab_locations,
  expenses: m.trip_tab_expenses,
}

const TAB_ICONS: Record<TripTab, ReactNode> = {
  interview: <MessageSquare />,
  people: <Users />,
  members: <UserCheck />,
  plan: <Calendar />,
  photos: <Images />,
  locations: <Navigation />,
  expenses: <Wallet />,
}

interface TripTabsProps {
  tab: TripTab
  onTabChange: (tab: TripTab) => void
  /** The content of the Wywiad tab: a view, so this component stays free of the data layer. */
  interview: ReactNode
  /** The content of the Osoby tab: a view, so this component stays free of the data layer. */
  people: ReactNode
  /** The content of the Członkowie tab: a view, so this component stays free of the data layer. */
  members: ReactNode
  /** The content of the Plan tab: a view, so this component stays free of the data layer. */
  plan: ReactNode
  /** The content of the Wydatki tab: a view. */
  expenses: ReactNode
  /** The content of the Zdjęcia tab. */
  photos: ReactNode
  /** The content of the Lokalizacje tab. */
  locations: ReactNode
}

/** Wywiad, Osoby, Członkowie, Plan, Wydatki, Zdjęcia, Lokalizacje: a scrollable segment switch. */

export function TripTabs({
  tab,
  onTabChange,
  interview,
  people,
  members,
  plan,
  photos,
  locations,
  expenses,
}: TripTabsProps) {
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        const next = TRIP_TABS.find((candidate) => candidate === value)
        if (next) onTabChange(next)
      }}
    >
      <TabsList
        aria-label={m.trip_tabs_label()}
        className="auto-cols-[minmax(max-content,1fr)] overflow-x-auto md:max-w-3xl print:hidden"
        data-tour={TOUR.tripTabs}
      >
        {TRIP_TABS.map((value) => (
          <TabsTrigger key={value} value={value}>
            <span aria-hidden="true">{TAB_ICONS[value]}</span>
            <span className="truncate">{TAB_LABELS[value]()}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="interview">{interview}</TabsContent>
      <TabsContent value="people">{people}</TabsContent>
      <TabsContent value="members">{members}</TabsContent>
      <TabsContent value="plan">{plan}</TabsContent>
      <TabsContent value="photos">{photos}</TabsContent>
      <TabsContent value="locations">{locations}</TabsContent>
      <TabsContent value="expenses">{expenses}</TabsContent>
    </Tabs>
  )
}
