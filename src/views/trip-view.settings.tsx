import { Settings } from '@keyline-icons/react'
import { useState } from 'react'
import type { Trip } from '@/api/queries/trips'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { TripForm } from '@/components/trips/trip-form'
import { Button } from '@/components/ui/button'
import { useCities } from '@/hooks/use-cities'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useSaveTrip } from '@/hooks/use-save-trip'
import { useSession } from '@/hooks/use-session'
import { TOUR } from '@/lib/help'
import { tripToFormValues } from '@/lib/trip-form'
import { m } from '@/paraglide/messages'

/**
 * Trip settings: edit for host and co-host. Deleting lives next to this button (trip-view.delete).
 */
export function TripSettings({ trip }: { trip: Trip }) {
  // Members get nothing, and none of the editor's hooks run for them.
  if (trip.my_role === 'member') return null
  return <TripSettingsEditor trip={trip} />
}

function TripSettingsEditor({ trip }: { trip: Trip }) {
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const session = useSession()
  const { cities } = useCities(session.status)
  const save = useSaveTrip(trip, cities)

  const change = (next: boolean) => {
    setOpen(next)
    if (!next) {
      save.reset()
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-11 shrink-0 rounded-full md:h-9"
        data-tour={TOUR.tripSettings}
        onClick={() => setOpen(true)}
      >
        <Settings aria-hidden="true" />
        {m.trip_settings_open()}
      </Button>
      <ResponsiveModal
        open={open}
        onOpenChange={change}
        isDesktop={isDesktop}
        title={m.trip_settings_title()}
        description={m.trip_settings_description()}
      >
        <TripForm
          initial={tripToFormValues(trip)}
          tripCurrency={trip.currency}
          cities={cities}
          fieldErrors={save.fieldErrors}
          submitError={save.submitError}
          isSubmitting={save.isPending}
          submitLabel={m.trip_settings_save()}
          submittingLabel={m.trip_settings_saving()}
          onSubmit={async (values) => {
            if (await save.submit(values)) change(false)
          }}
        />
      </ResponsiveModal>
    </>
  )
}
