import { Settings } from '@keyline-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { Trip } from '@/api/queries/trips'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { DeleteTripConfirm } from '@/components/trips/delete-trip-confirm'
import { TripForm } from '@/components/trips/trip-form'
import { Button } from '@/components/ui/button'
import { useCities } from '@/hooks/use-cities'
import { useCitySearch } from '@/hooks/use-city-search'
import { useDeleteTrip } from '@/hooks/use-delete-trip'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useSaveTrip } from '@/hooks/use-save-trip'
import { useSession } from '@/hooks/use-session'
import { TOUR } from '@/lib/help'
import { tripToFormValues } from '@/lib/trip-form'
import { m } from '@/paraglide/messages'

type Step = 'edit' | 'delete'

/**
 * Trip settings: edit for host and co-host, delete for the host only. Deleting asks first, in the
 * same modal, and leads back to the list.
 */
export function TripSettings({ trip }: { trip: Trip }) {
  // Members get nothing, and none of the editor's hooks run for them.
  if (trip.my_role === 'member') return null
  return <TripSettingsEditor trip={trip} />
}

function TripSettingsEditor({ trip }: { trip: Trip }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('edit')
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const navigate = useNavigate()
  const session = useSession()
  const { cities } = useCities(session.status)
  const save = useSaveTrip(trip, cities)
  const citySearch = useCitySearch(session.status)
  const remove = useDeleteTrip(() => navigate({ to: '/trips' }))

  const change = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setStep('edit')
      save.reset()
      remove.reset()
    }
  }

  const confirmDelete = () => remove.mutate({ params: { path: { trip_id: trip.id } } })

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
        wide={step === 'edit'}
        title={step === 'edit' ? m.trip_settings_title() : m.trip_delete_title()}
        description={step === 'edit' ? m.trip_settings_description() : m.trip_delete_description()}
      >
        {step === 'edit' ? (
          <TripForm
            initial={tripToFormValues(trip)}
            tripCurrency={trip.currency}
            cities={cities}
            citySearch={citySearch}
            fieldErrors={save.fieldErrors}
            submitError={save.submitError}
            isSubmitting={save.isPending}
            submitLabel={m.trip_settings_save()}
            submittingLabel={m.trip_settings_saving()}
            onSubmit={async (values) => {
              if (await save.submit(values)) change(false)
            }}
            footer={
              trip.my_role === 'host' && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 text-destructive hover:text-destructive md:h-9"
                  onClick={() => setStep('delete')}
                >
                  {m.trip_delete_open()}
                </Button>
              )
            }
          />
        ) : (
          <DeleteTripConfirm
            tripName={trip.name}
            isDeleting={remove.isPending}
            failed={remove.isError}
            onConfirm={confirmDelete}
            onCancel={() => setStep('edit')}
          />
        )}
      </ResponsiveModal>
    </>
  )
}
