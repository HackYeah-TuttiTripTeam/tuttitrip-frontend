# TuttiTrip – frontend

Aplikacja frontendowa zespołu **TuttiTrip** tworzona na hackathon HackYeah.

## Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev) – bundler i serwer deweloperski
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Radix UI, ikony lucide)
- [TanStack Router](https://tanstack.com/router) – routing oparty na plikach, z automatycznym code splittingiem
- [TanStack Query](https://tanstack.com/query) – pobieranie i cache'owanie danych z API
- [oxlint](https://oxc.rs) – linter

## Wymagania

- Node.js 22+
- [pnpm](https://pnpm.io) (`corepack enable` albo `npm i -g pnpm`)

## Uruchomienie

```bash
pnpm install
pnpm dev
```

Aplikacja wystartuje pod adresem http://localhost:5173.

## Skrypty

| Komenda        | Opis                                                |
| -------------- | --------------------------------------------------- |
| `pnpm dev`     | serwer deweloperski z HMR                           |
| `pnpm build`   | sprawdzenie typów (`tsc -b`) i build produkcyjny    |
| `pnpm preview` | podgląd buildu produkcyjnego                        |
| `pnpm lint`    | linter (oxlint)                                     |

## Struktura projektu

```
src/
├── components/
│   └── ui/              # komponenty shadcn/ui (generowane przez CLI)
├── lib/
│   ├── query-client.ts  # konfiguracja TanStack Query
│   └── utils.ts         # helper cn() do łączenia klas Tailwinda
├── routes/              # trasy aplikacji (routing oparty na plikach)
│   ├── __root.tsx       # layout główny, nawigacja, devtools
│   ├── index.tsx        # strona główna (/)
│   └── about.tsx        # /about
├── routeTree.gen.ts     # drzewo tras GENEROWANE automatycznie – nie edytuj
├── router.tsx           # instancja routera
└── main.tsx             # punkt wejścia
```

Alias `@/` wskazuje na katalog `src/` (np. `import { Button } from '@/components/ui/button'`).

## Jak pracować z projektem

### Dodawanie komponentów shadcn/ui

```bash
pnpm dlx shadcn@latest add dialog input
```

Komponenty trafiają do `src/components/ui/`. Można je dowolnie modyfikować, bo to nasz kod, a nie zależność.

### Dodawanie nowej strony

Utwórz plik w `src/routes/`, np. `src/routes/trips/$tripId.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/trips/$tripId')({
  component: TripPage,
})

function TripPage() {
  const { tripId } = Route.useParams()
  return <h1>Wycieczka {tripId}</h1>
}
```

Gdy działa `pnpm dev` (albo podczas `pnpm build`), plugin Vite sam zaktualizuje `routeTree.gen.ts`. Konwencje nazewnictwa plików opisuje [dokumentacja TanStack Router](https://tanstack.com/router/latest/docs/framework/react/routing/file-based-routing).

### Pobieranie danych

Zapytania definiujemy przez `queryOptions` i ładujemy w `loader` trasy, dzięki czemu dane zaczynają się pobierać jeszcze przed renderem (oraz przy najechaniu na link). Przykład jest w `src/routes/index.tsx`:

```tsx
const tripsQueryOptions = queryOptions({
  queryKey: ['trips'],
  queryFn: () => fetch('/api/trips').then((res) => res.json()),
})

export const Route = createFileRoute('/trips')({
  loader: ({ context }) => context.queryClient.ensureQueryData(tripsQueryOptions),
  component: TripsPage,
})

function TripsPage() {
  const { data } = useSuspenseQuery(tripsQueryOptions)
  // ...
}
```

`queryClient` jest dostępny w kontekście routera (`context.queryClient`).

### Devtools

W trybie deweloperskim w rogach ekranu są dostępne devtoolsy TanStack Router (prawy dolny) i TanStack Query (lewy dolny).
