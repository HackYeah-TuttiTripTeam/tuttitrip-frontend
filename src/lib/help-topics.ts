import { TOUR, type TourStep, type TourTopic } from '@/lib/help'
import type { TripTab } from '@/lib/trip-tabs'
import { m } from '@/paraglide/messages'

export const tripsTopic: TourTopic = {
  id: 'trips',
  title: m.help_trips_title,
  steps: [
    {
      id: 'header',
      target: TOUR.tripsHeader,
      title: m.help_trips_header_title,
      body: m.help_trips_header_body,
    },
    {
      id: 'new',
      target: TOUR.newTrip,
      title: m.help_trips_new_title,
      body: m.help_trips_new_body,
    },
    {
      id: 'toolbar',
      target: TOUR.tripsToolbar,
      optional: true,
      title: m.help_trips_toolbar_title,
      body: m.help_trips_toolbar_body,
    },
    {
      id: 'list',
      target: TOUR.tripsList,
      optional: true,
      title: m.help_trips_list_title,
      body: m.help_trips_list_body,
    },
    {
      id: 'pagination',
      target: TOUR.tripsPagination,
      optional: true,
      title: m.help_trips_pagination_title,
      body: m.help_trips_pagination_body,
    },
  ],
}

const tripHeaderSteps: TourStep[] = [
  {
    id: 'header',
    target: TOUR.tripHeader,
    title: m.help_trip_header_title,
    body: m.help_trip_header_body,
  },
  {
    id: 'settings',
    target: TOUR.tripSettings,
    optional: true,
    title: m.help_trip_settings_title,
    body: m.help_trip_settings_body,
  },
  {
    id: 'tabs',
    target: TOUR.tripTabs,
    title: m.help_trip_tabs_title,
    body: m.help_trip_tabs_body,
  },
]

const peopleSteps: TourStep[] = [
  {
    id: 'people',
    target: TOUR.peopleList,
    optional: true,
    title: m.help_people_list_title,
    body: m.help_people_list_body,
  },
  {
    id: 'invite',
    target: TOUR.peopleInvite,
    optional: true,
    title: m.help_people_invite_title,
    body: m.help_people_invite_body,
  },
  {
    id: 'vote',
    target: TOUR.voteLinks,
    optional: true,
    title: m.help_people_vote_title,
    body: m.help_people_vote_body,
  },
]

const membersSteps: TourStep[] = [
  {
    id: 'membership',
    target: TOUR.membership,
    optional: true,
    title: m.help_members_membership_title,
    body: m.help_members_membership_body,
  },
  {
    id: 'list',
    target: TOUR.membersList,
    optional: true,
    title: m.help_members_list_title,
    body: m.help_members_list_body,
  },
]

const planSteps: TourStep[] = [
  {
    id: 'empty',
    target: TOUR.planEmpty,
    optional: true,
    title: m.help_plan_empty_title,
    body: m.help_plan_empty_body,
  },
  {
    id: 'actions',
    target: TOUR.planActions,
    optional: true,
    title: m.help_plan_actions_title,
    body: m.help_plan_actions_body,
  },
  {
    id: 'summary',
    target: TOUR.planSummary,
    optional: true,
    title: m.help_plan_summary_title,
    body: m.help_plan_summary_body,
  },
  {
    id: 'fairness',
    target: TOUR.fairnessPanel,
    optional: true,
    title: m.help_plan_fairness_title,
    body: m.help_plan_fairness_body,
  },
  {
    id: 'days',
    target: TOUR.planDays,
    optional: true,
    title: m.help_plan_days_title,
    body: m.help_plan_days_body,
  },
]

const TAB_STEPS: Record<TripTab, TourStep[]> = {
  interview: [],
  people: peopleSteps,
  members: membersSteps,
  plan: planSteps,
  expenses: [],
}

const tabTitle: Record<TripTab, () => string> = {
  interview: m.help_trip_title,
  people: m.help_trip_people_title,
  members: m.help_trip_members_title,
  plan: m.help_trip_plan_title,
  expenses: m.help_trip_expenses_title,
}

/** One topic per tab, built once: the registry compares topics by identity. */
export const tripTopics: Record<TripTab, TourTopic> = {
  interview: { id: 'trip-interview', title: tabTitle.interview, steps: tripHeaderSteps },
  people: {
    id: 'trip-people',
    title: tabTitle.people,
    steps: [...tripHeaderSteps, ...TAB_STEPS.people],
  },
  members: {
    id: 'trip-members',
    title: tabTitle.members,
    steps: [...tripHeaderSteps, ...TAB_STEPS.members],
  },
  plan: { id: 'trip-plan', title: tabTitle.plan, steps: [...tripHeaderSteps, ...TAB_STEPS.plan] },
  expenses: {
    id: 'trip-expenses',
    title: tabTitle.expenses,
    steps: [...tripHeaderSteps, ...TAB_STEPS.expenses],
  },
}

export const joinTopic: TourTopic = {
  id: 'join',
  title: m.help_join_title,
  steps: [
    {
      id: 'trip',
      target: TOUR.joinTrip,
      title: m.help_join_trip_title,
      body: m.help_join_trip_body,
    },
    {
      id: 'name',
      target: TOUR.joinName,
      optional: true,
      title: m.help_join_name_title,
      body: m.help_join_name_body,
    },
    {
      id: 'submit',
      target: TOUR.joinSubmit,
      title: m.help_join_submit_title,
      body: m.help_join_submit_body,
    },
  ],
}
