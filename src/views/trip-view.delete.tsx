import { Bin } from '@keyline-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { Trip } from '@/api/queries/trips'
import { DeleteTripDialog } from '@/components/trips/delete-trip-dialog'
import { Button } from '@/components/ui/button'
import { useDeleteTrip } from '@/hooks/use-delete-trip'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { m } from '@/paraglide/messages'

/** "Usuń wyjazd" next to the settings button; only the host sees it. Leads back to the list. */
export function TripDelete({ trip }: { trip: Trip }) {
  if (trip.my_role !== 'host') return null
  return <TripDeleteButton trip={trip} />
}

function TripDeleteButton({ trip }: { trip: Trip }) {
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const navigate = useNavigate()
  const remove = useDeleteTrip(() => navigate({ to: '/trips' }))

  const close = () => {
    setOpen(false)
    remove.reset()
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-11 shrink-0 rounded-full text-destructive hover:text-destructive md:h-9"
        onClick={() => setOpen(true)}
      >
        <Bin aria-hidden="true" />
        {m.trip_delete_open()}
      </Button>
      <DeleteTripDialog
        tripName={open ? trip.name : null}
        isDesktop={isDesktop}
        pending={remove.isPending}
        failed={remove.isError}
        onConfirm={() => remove.mutate({ params: { path: { trip_id: trip.id } } })}
        onCancel={close}
      />
    </>
  )
}
