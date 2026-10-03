import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { loadTrip, tripSearchDefaults, tripSearchSchema } from '@/loaders/trip'
import { TripView } from '@/views/trip-view'

// "trips_" keeps this route out of the /trips layout: it is a page of its own, not a child of the list.
export const Route = createFileRoute('/trips_/$tripId')({
  validateSearch: tripSearchSchema,
  search: { middlewares: [stripSearchParams(tripSearchDefaults)] },
  loader: loadTrip,
  component: TripView,
})
