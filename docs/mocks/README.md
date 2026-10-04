# Makiety ekranów z pitch decku

`pitch-deck.html` to kopia 1:1 pitch decku TuttiTrip (10 slajdów, SVG w treści, działa bez sieci).
Otwórz plik w przeglądarce i przełączaj slajdy strzałkami. Makiety na slajdach są interaktywne.

Makiety są odniesieniem wizualnym. Przy każdej sprzeczności pierwszeństwo mają design system
(tokeny, komponenty, słownik UI w `.claude/skills/tuttitrip-design-system`) i `DESIGN.md`.
Skopiuj układ i zachowanie, nie style z pliku.

## Lista makiet

| Slajd | Ekran | Komponenty design systemu |
| --- | --- | --- |
| 1 | Tytuł z miarą sprawiedliwości: porównanie planu czatbota i planu TuttiTrip, pole pierwszego zdania z mikrofonem | `FairnessMeter`, `Button`, `ScreenLanding` |
| 2 | Sprawdzenie planu: plan z czatbota obok planu TuttiTrip, liczba problemów | `LinterReport`, `Badge`, `PlanTimeline` |
| 4 | Wywiad: ocena miejsc (chcę, obojętnie, nie chcę) z powodem, panel „Co już wiem”, zdanie głosem | `InterviewCard`, `RatingControl`, `Badge`, `ScreenInterviewChat`, `ScreenInterviewVoice` |
| 5 | Plan dnia z godzinami, cenami i werdyktem, szczegół miejsca z głosami, sprawiedliwość i koszt dnia | `PlanTimeline`, `PlaceCard`, `VerdictBadge`, `FairnessMeter`, `BudgetBar`, `BottomNav`, `ScreenPlanBuilder` |
| 6 | Propozycja zmiany z głosami i wymuszenie decyzji przez hosta z kosztem, sprawiedliwość po decyzji, problem poniżej podłogi | `OverrideCost`, `Badge`, `FairnessMeter`, `ScreenDecisions` |
| 7 | Przeplanowanie przy deszczu: nowa reszta dnia, zmienione pozycje, co sprawdził kod | `ReplanBar`, `PlanTimeline`, `PlanProgress`, `Badge` |
| 8 | Rozliczenie: wydatki, niepewny odczyt paragonu do potwierdzenia, lista przelewów | `Settlement`, `Badge`, `PersonChip` |

Slajdy 3 (jak to działa), 9 (architektura) i 10 (zamknięcie) nie pokazują ekranów aplikacji.

W pitch decku nie ma makiet noclegów, karty zatwierdzenia (`ApprovalCard`) ani formularza
wydatku. Dla nich obowiązuje wyłącznie design system.
