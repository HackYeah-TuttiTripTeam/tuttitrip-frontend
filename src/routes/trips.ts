import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { loadTrips, tripsSearchDefaults, tripsSearchSchema } from '@/loaders/trips'
import { TripsView } from '@/views/trips-view'

export const Route = createFileRoute('/trips')({
  validateSearch: tripsSearchSchema,
  search: { middlewares: [stripSearchParams(tripsSearchDefaults)] },
  loaderDeps: ({ search }) => search,
  loader: loadTrips,
  component: TripsView,
})
