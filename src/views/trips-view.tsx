import { getRouteApi } from '@tanstack/react-router'
import { CloudOff, KeyRound, Luggage, Plus, SearchX, TriangleAlert } from 'lucide-react'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import { StatusMessage } from '@/components/shared/status-message'
import { CreateTripForm } from '@/components/trips/create-trip-form'
import { TripsTable, TripsTableSkeleton } from '@/components/trips/trips-table'
import { TripsToolbar } from '@/components/trips/trips-toolbar'
import { Button } from '@/components/ui/button'
import { useCreateTrip } from '@/hooks/use-create-trip'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useSession } from '@/hooks/use-session'
import { useTrips } from '@/hooks/use-trips'
import { plural } from '@/lib/format'
import type { SortDirection, TripSortKey } from '@/loaders/trips'
import { useUiStore } from '@/stores/ui-store'

const route = getRouteApi('/trips')
const TRIP_FORMS = ['wyjazd', 'wyjazdy', 'wyjazdów'] as const

export function TripsView() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const session = useSession()
  const { trips, total, isPending, problem, refetch } = useTrips(search, session.status)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const createTripOpen = useUiStore((state) => state.createTripOpen)
  const setCreateTripOpen = useUiStore((state) => state.setCreateTripOpen)
  const createTrip = useCreateTrip()

  // replace: typing in the search box should not flood the back button.
  const setQuery = (q: string) =>
    void navigate({ search: (prev) => ({ ...prev, q }), replace: true })
  const setSort = (sort: TripSortKey, dir: SortDirection) =>
    void navigate({ search: (prev) => ({ ...prev, sort, dir }), replace: true })

  const openCreate = () => {
    createTrip.reset()
    setCreateTripOpen(true)
  }

  const needsLogin = session.status === 'anonymous' || problem === 'unauthorized'
  const showList = !needsLogin && !problem && !isPending && session.status !== 'loading'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Wyjazdy</h1>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {showList && total > 0
              ? search.q
                ? `${plural(trips.length, TRIP_FORMS)} z ${total}`
                : plural(total, TRIP_FORMS)
              : 'Plany, które układacie razem.'}
          </p>
        </div>
      </div>

      {showList && total > 0 && (
        <TripsToolbar
          query={search.q}
          onQueryChange={setQuery}
          sort={search.sort}
          dir={search.dir}
          onSortChange={setSort}
        />
      )}

      {session.status === 'loading' || isPending ? (
        <TripsTableSkeleton />
      ) : session.error && session.status === 'anonymous' ? (
        <StatusMessage
          role="alert"
          icon={<TriangleAlert />}
          title="Logowanie nie powiodło się"
          action={<Button onClick={session.login}>Spróbuj ponownie</Button>}
        >
          {session.error}
        </StatusMessage>
      ) : needsLogin ? (
        <StatusMessage
          icon={<KeyRound />}
          title="Zaloguj się, żeby zobaczyć wyjazdy"
          action={
            session.status === 'disabled' ? undefined : (
              <Button onClick={session.login}>Zaloguj się</Button>
            )
          }
        >
          {session.status === 'disabled'
            ? 'API wymaga logowania, a Auth0 nie jest skonfigurowane. Uzupełnij VITE_AUTH0_* w .env.local.'
            : 'Wyjazdy są przypisane do konta organizatora. Możesz użyć Google albo Discorda.'}
        </StatusMessage>
      ) : problem === 'offline' ? (
        <StatusMessage
          role="alert"
          icon={<CloudOff />}
          title="Brak połączenia z API"
          action={
            <Button variant="outline" onClick={refetch}>
              Spróbuj ponownie
            </Button>
          }
        >
          Nie udało się połączyć z serwerem. Sprawdź internet albo czy backend działa.
        </StatusMessage>
      ) : problem ? (
        <StatusMessage
          role="alert"
          icon={<TriangleAlert />}
          title="Nie udało się wczytać wyjazdów"
          action={
            <Button variant="outline" onClick={refetch}>
              Spróbuj ponownie
            </Button>
          }
        >
          Serwer odpowiedział błędem. Spróbuj za chwilę.
        </StatusMessage>
      ) : total === 0 ? (
        <StatusMessage
          icon={<Luggage />}
          title="Pierwszy wyjazd zaczyna się od nazwy"
          action={
            <Button onClick={openCreate}>
              <Plus />
              Nowy wyjazd
            </Button>
          }
        >
          Wpisz, dokąd i kiedy jedziecie. Preferencje każdej osoby zbierze potem wywiad, a plan
          ułoży się tak, żeby nikt nie wyszedł na tym gorzej.
        </StatusMessage>
      ) : trips.length === 0 ? (
        <StatusMessage
          icon={<SearchX />}
          title={`Nic nie pasuje do „${search.q}”`}
          action={
            <Button variant="outline" onClick={() => setQuery('')}>
              Wyczyść wyszukiwanie
            </Button>
          }
        >
          Szukamy w nazwach i celach podróży.
        </StatusMessage>
      ) : (
        <TripsTable trips={trips} sort={search.sort} dir={search.dir} onSortChange={setSort} />
      )}

      <ResponsiveModal
        open={createTripOpen}
        onOpenChange={setCreateTripOpen}
        isDesktop={isDesktop}
        title="Nowy wyjazd"
        description="Na start wystarczy nazwa. Resztę uzupełnicie w wywiadzie."
      >
        <CreateTripForm
          isSubmitting={createTrip.isPending}
          submitError={
            createTrip.isError ? 'Nie udało się utworzyć wyjazdu. Spróbuj ponownie.' : null
          }
          onSubmit={(values) =>
            createTrip.mutate(
              { body: { name: values.name, destination: values.destination || null } },
              { onSuccess: () => setCreateTripOpen(false) },
            )
          }
        />
      </ResponsiveModal>
    </div>
  )
}
