import { CloudOff, TriangleAlert } from '@keyline-icons/react'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { ApiError } from '@/api/errors'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { StatusMessage } from '@/components/shared/status-message'
import { CheckinForm } from '@/components/trips/checkin-form'
import {
  CheckinSection,
  CheckinSectionSkeleton,
  type CheckinSortKey,
} from '@/components/trips/checkin-section'
import { Button } from '@/components/ui/button'
import { useCheckinActions, useCheckins } from '@/hooks/use-checkins'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { hasAccount, type Person } from '@/lib/people'
import { CHECKINS_PAGE_SIZE } from '@/lib/trip-extras'
import { m } from '@/paraglide/messages'

/** A 409 means the trip is over: its check-ins are closed. */
function saveMessage(error: unknown): string | null {
  if (!error) return null
  return error instanceof ApiError && error.status === 409
    ? m.checkin_save_ended()
    : m.checkin_save_failed()
}

const route = getRouteApi('/trips_/$tripId')

interface TripCheckinsViewProps {
  tripId: string
  people: Person[]
  /** Host only (the API answers 403 to a co-host): may also set the entry of people without an account. */
  canFillIn: boolean
}

/** "Zameldowanie" under the people of the Osoby tab. Page, sort and filter live in the URL (ci_*). */
export function TripCheckinsView({ tripId, people, canFillIn }: TripCheckinsViewProps) {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const checkins = useCheckins(tripId, {
    page: search.ci_page,
    size: CHECKINS_PAGE_SIZE,
    sort: search.ci_sort,
    dir: search.ci_dir,
    accommodation: search.ci_q,
  })
  const actions = useCheckinActions(tripId)
  const [editing, setEditing] = useState<string | null>(null)

  const setSearch = (patch: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  const editable = people.filter((person) => person.isMe || (canFillIn && !hasAccount(person)))
  const editableIds = new Set(editable.map((person) => person.profile.id))
  const items = checkins.page?.items ?? []
  const savedFor = (profileId: string) => {
    const entry = items.find((candidate) => candidate.profile_id === profileId)
    return { accommodation: entry?.accommodation ?? '', room: entry?.room ?? '' }
  }
  const close = () => {
    setEditing(null)
    actions.resetSave()
  }
  // The caller's own profile is the default pick; a host without one starts with the first person.
  const start = editable.find((person) => person.isMe) ?? editable[0]

  if (checkins.isPending) return <CheckinSectionSkeleton />

  if (checkins.problem || !checkins.page) {
    const offline = checkins.problem === 'offline'
    return (
      <StatusMessage
        role="alert"
        icon={offline ? <CloudOff /> : <TriangleAlert />}
        title={offline ? m.trips_offline_title() : m.checkin_load_failed_title()}
        action={
          <Button variant="outline" onClick={checkins.refetch}>
            {m.action_retry()}
          </Button>
        }
      >
        {offline ? m.trips_offline_body() : m.trips_load_failed_body()}
      </StatusMessage>
    )
  }

  return (
    <>
      <CheckinSection
        items={items}
        total={checkins.page.total}
        page={checkins.page.page}
        pages={checkins.page.pages}
        sort={search.ci_sort}
        dir={search.ci_dir}
        query={search.ci_q}
        isFetching={checkins.isFetching}
        editableIds={editableIds}
        canSet={start !== undefined}
        onAdd={() => start && setEditing(start.profile.id)}
        onEdit={setEditing}
        onRemove={(profileId) => void actions.remove(profileId)}
        onQueryChange={(ci_q) => setSearch({ ci_q, ci_page: 1 })}
        onSortChange={(ci_sort: CheckinSortKey, ci_dir) =>
          setSearch({ ci_sort, ci_dir, ci_page: 1 })
        }
        onPageChange={(ci_page) => setSearch({ ci_page })}
      />
      <ResponsiveModal
        open={editing !== null}
        onOpenChange={(open) => !open && close()}
        isDesktop={isDesktop}
        title={m.checkin_dialog_title()}
        description={m.checkin_dialog_description()}
      >
        {editing !== null && (
          <CheckinForm
            // A new form per opened person: the defaults come from the saved entry.
            key={editing}
            people={editable.map((person) => ({
              profileId: person.profile.id,
              name: person.profile.display_name,
            }))}
            initial={{ profileId: editing, ...savedFor(editing) }}
            savedFor={savedFor}
            isSubmitting={actions.isSaving}
            error={saveMessage(actions.saveError)}
            onCancel={close}
            onSubmit={(profileId, accommodation, room) =>
              void actions.save(profileId, accommodation, room).then(close, () => undefined)
            }
          />
        )}
      </ResponsiveModal>
    </>
  )
}
