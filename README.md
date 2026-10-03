# 🌍 TuttiTrip Frontend

Cześć! To interfejs aplikacji TuttiTrip, zaprojektowany z myślą o płynnym, błyskawicznym planowaniu podróży na telefonie i komputerze.

### ⚡ Szybki start lokalnie

1. **Zainstaluj pnpm** (jeśli jeszcze nie masz):
   ```bash
   corepack enable && corepack prepare pnpm@latest --activate
   ```
2. **Pobierz zależności i przygotuj środowisko:**
   ```bash
   pnpm install
   cp .env.example .env.local
   ```
3. **Zsynchronizuj endpointy z backendem i odpal dev-serwer:**
   ```bash
   pnpm run api:sync
   pnpm dev
   ```
   Aplikacja wystartuje pod `http://localhost:5173`.

### 📱 Instalacja na telefonie (PWA)
Otwórz link aplikacji w Safari (iOS) lub Chrome (Android) i wybierz **"Dodaj do ekranu głównego"** – zyskasz pełnoekranową aplikację z obsługą gestów i trybem offline.

## Wymagania

- Node.js 22 lub nowszy
- pnpm (wersja jest przypięta w `package.json`, `corepack` dobierze ją sam)
- Backend opcjonalnie. W repo leży wygenerowany kontrakt API (`src/api/schema.d.ts`), więc świeży klon zbuduje się bez backendu.

## Zmienne środowiskowe

Skopiuj `.env.example` do `.env.local` (ten plik nie trafia do gita) i uzupełnij to, czego potrzebujesz:

| Zmienna | Co to jest | Domyślnie |
| --- | --- | --- |
| `VITE_API_URL` | adres backendu, bez `/` na końcu | `http://localhost:8000` |
| `VITE_AUTH0_DOMAIN` | domena tenanta Auth0 | puste, logowanie wyłączone |
| `VITE_AUTH0_CLIENT_ID` | client id aplikacji SPA w Auth0 | puste, logowanie wyłączone |
| `VITE_AUTH0_AUDIENCE` | identyfikator API w Auth0 (np. `https://tuttitrip-api.gburek.app`) | puste |

Wszystkie te wartości lądują w kodzie przeglądarki, więc nie wpisuj tu sekretów. Tenant Auth0 konfiguruje zespół backendu. Bez `VITE_AUTH0_*` aplikacja działa, a w miejscu logowania wyświetla informację, że jest wyłączone.

Do pracy na wdrożonym API zamiast lokalnego ustaw `VITE_API_URL=https://tuttitrip-api-develop.gburek.app`.

## Kontrakt API (`api:sync`)

Typy endpointów generujemy z `/openapi.json` backendu (`openapi-typescript`). Zapytania idą przez `openapi-fetch` i `openapi-react-query`, więc literówka w ścieżce albo w nazwie pola wychodzi już przy kompilacji.

```bash
pnpm api:sync                                                            # z VITE_API_URL albo localhost:8000
pnpm api:sync --url https://tuttitrip-api-develop.gburek.app/openapi.json
API_SCHEMA_URL=./openapi.json pnpm api:sync                              # z pliku
```

Po zmianie w backendzie odpal `api:sync` i zacommituj `src/api/schema.d.ts`. CI pobiera kontrakt przy każdym buildzie, więc zmiana API, która psuje frontend, wywali `tsc`.

## Skrypty

| Komenda | Co robi |
| --- | --- |
| `pnpm dev` | serwer deweloperski z HMR |
| `pnpm build` | sprawdzenie typów i build produkcyjny do `dist/` |
| `pnpm preview` | podgląd buildu (z service workerem, czyli z PWA) |
| `pnpm biome check --write .` | lint, formatowanie i porządkowanie importów (Biome) |
| `pnpm tsc -b` | sprawdzenie typów |
| `pnpm test:arch` | testy architektury (dependency-cruiser i `scripts/check-arch.mjs`) |
| `pnpm verify` | to, co CI odpala przed buildem: `biome ci`, `tsc -b`, `test:arch` |
| `pnpm api:sync` | regeneracja typów API |
| `pnpm pwa:icons` | ikony PWA z `public/logo.svg` |

Przed każdym commitem: `pnpm biome check --write . && pnpm tsc -b && pnpm test:arch`.

## Stack

React 19, TypeScript (strict), Vite, TanStack Router (routing z plików, parametry wyszukiwania walidowane Zodem), TanStack Query, TanStack Table, Zustand, react-hook-form z Zodem, shadcn/ui na Tailwind v4, Auth0, `vite-plugin-pwa`, Biome, hosting na Cloudflare Workers. Szczegóły i uzasadnienia są w `AGENTS.md`.

## Struktura i zasady architektury

```
src/
├── routes/            tylko definicje tras (.ts, bez JSX): component, loader, validateSearch
├── views/             strony: składają komponenty i hooki
├── components/ui/     komponenty shadcn (generowane)
├── components/shared/ wspólne bloki: layout aplikacji, modal/drawer, komunikaty stanów
├── components/trips/  komponenty jednej funkcji (tu: lista wyjazdów)
├── hooks/             logika i hooki pomocnicze, bez JSX
├── stores/            store'y Zustand (stan UI i sesji)
├── loaders/           schematy parametrów URL (Zod) i loadery tras
├── api/               klient openapi-fetch, wygenerowany schema.d.ts, query options
├── lib/               drobne helpery: env, formatowanie dat, query client
└── styles/            tokeny designu (jedyne miejsce z kolorami)
```

Zasady pilnowane automatycznie (`pnpm test:arch` i Biome, CI odrzuca złamanie którejkolwiek):

1. Widok nie importuje innego widoku.
2. Komponenty z `components/` są czysto prezentacyjne: nie sięgają do `views/`, `hooks/`, `stores/`, API ani TanStack Query. Dane i akcje dostają przez propsy.
3. W `hooks/` nie ma JSX (tylko pliki `.ts`).
4. Pliki tras importują wyłącznie widoki i loadery.
5. Żadnych zahardkodowanych kolorów w klasach Tailwinda (`bg-[#...]`, `text-[rgb(...)]`, `bg-red-500` i podobne). Używamy tokenów shadcn: `bg-primary`, `text-muted-foreground`, `border` i tak dalej.

Sortowanie i filtrowanie zawsze trzymamy w adresie URL, np. `/trips?q=kraków&sort=name&dir=asc`. Taki link można wysłać komuś z rodziny i zobaczy dokładnie ten sam widok.

Przykładowa funkcja, na której można się wzorować, to lista wyjazdów: `api/queries/trips.ts` → `hooks/use-trips.ts` → `components/trips/` → `views/trips-view.tsx` → `routes/trips.ts`.

## Środowiska i wdrożenia

Frontend stoi na Cloudflare Workers (statyczne pliki z fallbackiem SPA, więc działają też bezpośrednie linki do podstron).

| Gałąź | Adres frontendu | API |
| --- | --- | --- |
| `main` | https://tuttitrip.gburek.app | https://tuttitrip-api.gburek.app |
| `develop` | https://tuttitrip-develop.gburek.app | https://tuttitrip-api-develop.gburek.app |
| PR z innej gałęzi | `https://tuttitrip-preview-<slug>.gburek.app` (link pojawia się w komentarzu pod PR) | patrz niżej |

Wdraża GitHub Actions (`.github/workflows/frontend-ci.yml`) na runnerze `[self-hosted, hackathon]`: push do `main` lub `develop` wdraża dane środowisko, a każdy PR dostaje własny podgląd. Bot wrzuca link w komentarzu i przy kolejnych pushach aktualizuje ten sam komentarz, zamiast dodawać nowe.

Po usunięciu gałęzi (po merge'u PR uruchamia go workflow `Delete merged branch`) workflow `frontend-cleanup.yml` kasuje Workera `tuttitrip-preview-<slug>` razem z jego domeną i zmienia komentarz w PR na „Podgląd usunięty”. To samo sprzątanie leci przy każdym wdrożeniu, gdyby zdarzenie usunięcia gałęzi nie dotarło. Skrypt rusza wyłącznie Workery o nazwach `tuttitrip-preview-*`, więc produkcja i develop są bezpieczne.

## Która gałąź frontendu rozmawia z którym backendem

Frontend z gałęzi X używa API z gałęzi backendu o tej samej nazwie. Jeśli backend takiej gałęzi nie ma, bierzemy najbliższą „wyższą”: najpierw develop, potem main.

- `main` zawsze używa `https://tuttitrip-api.gburek.app`.
- `develop` używa `https://tuttitrip-api-develop.gburek.app`, a gdyby go nie było, produkcji.
- `feature/cos-tam` najpierw próbuje `https://tuttitrip-api-feature-cos-tam.gburek.app`, potem develop, potem main.

Slug gałęzi to jej nazwa małymi literami, z każdym ciągiem znaków spoza `a-z0-9` zamienionym na `-` (tak samo jak w backendzie). CI sprawdza, które API odpowiada (`scripts/resolve-api.sh`), pobiera z niego kontrakt i z nim buduje aplikację.

## Git flow

1. Zaczynasz od `develop`: `git switch -c feature/krotki-opis`.
2. Kolejność pracy nad funkcją: zapytania i hooki → komponenty → widok → trasa.
3. Przed commitem odpalasz weryfikację (patrz „Skrypty”).
4. PR do `develop`, z opisem, listą zmian i zrzutami ekranu (desktop i telefon). Wydanie to PR z `develop` do `main`.
5. Po merge'u gałąź usuwa workflow `Delete merged branch`, a razem z nią znika jej podgląd. `main` i `develop` nie są nigdy usuwane, więc PR wydania idzie prosto z `develop`.

Do `main` i `develop` wchodzimy tylko przez PR z zielonym CI i nigdy nie robimy force-pusha. GitHub nie pozwala włączyć ochrony gałęzi w prywatnym repo organizacji na darmowym planie, więc na razie pilnujemy tego sami.

## Co dalej

- Opcjonalny wrapper Capacitor, jeśli będziemy chcieli wrzucić aplikację do sklepów. Na razie wystarcza PWA.
- Sortowanie i filtrowanie po stronie serwera, kiedy API zacznie przyjmować takie parametry.
