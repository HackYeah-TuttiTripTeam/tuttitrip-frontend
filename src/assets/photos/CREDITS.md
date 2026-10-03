# Photo credits and licenses

Every photo of the public pages (`/`, `/about`, `/contact`) is listed here. The app shows
the attribution next to each photo ("Zdjęcie: author / Unsplash" with links to the author's
profile and the photo), see `src/components/public/photo-credit.tsx`.

## Unsplash photos

License: [Unsplash License](https://unsplash.com/license). The photos are free to use,
including commercially, without asking or crediting; we credit anyway. The license does not
let us sell unaltered copies or build a competing photo service from them. These are the
free photos, not Unsplash+.

Each photo was downloaded with the official Download button on its Unsplash page, on
2026-10-03. Nothing comes from Google Images or any other source. The files were then
cropped to a fixed aspect ratio, resized and converted to AVIF and WebP (all metadata
removed). No photo shows a recognisable person in a context that suggests they endorse the
product: crowds are small and distant, the family is seen from behind.

| Files (`src/assets/photos/`) | Author | Photo | Used for | Downloaded |
| --- | --- | --- | --- | --- |
| `warszawa-zamek-{480,960,1600}.{avif,webp}` | [Lāsma Artmane](https://unsplash.com/@lasmaa) | [Warsaw, Castle Square](https://unsplash.com/photos/p6gxHYb43v0) | Warszawa | 2026-10-03 |
| `gdansk-dlugi-targ-{480,960,1600}.{avif,webp}` | [Darya Tryfanava](https://unsplash.com/@darya_tryfanava) | [Gdańsk, Długi Targ](https://unsplash.com/photos/OoCU63dSKjU) | Gdańsk | 2026-10-03 |
| `krakow-rynek-{480,960,1600}.{avif,webp}` | [Aimable Mugabo](https://unsplash.com/@mugabo_library) | [Kraków, Main Square](https://unsplash.com/photos/iLr6iT9buiQ) | Kraków | 2026-10-03 |
| `berlin-brama-brandenburska-{480,960,1600}.{avif,webp}` | [Claudio Schwarz](https://unsplash.com/@purzlbaum) | [Berlin, Brandenburg Gate](https://unsplash.com/photos/TScGhJM716g) | Berlin | 2026-10-03 |
| `rodzina-na-sciezce-{400,800,1200}.{avif,webp}` | [Orlando Allo](https://unsplash.com/@orlandoallo) | [Family walking on a forest path](https://unsplash.com/photos/qRpOzXWsu3c) | Family trip | 2026-10-03 |

## The team's own photo

| Files (`src/assets/photos/`) | Author | Rights | Used for |
| --- | --- | --- | --- |
| `zespol-{320,640}.{avif,webp}` | The TuttiTrip team (own photo, HackYeah 2026, Kraków) | The team, used with the consent of the people in it | `/contact` |

Not an Unsplash photo, so the Unsplash License does not apply. Processing: cropped to the
photo band of a story frame (the gradient bars removed), faces of bystanders in the
background blurred, metadata removed. The five team members are not blurred. No names in
captions or alt text.

## How the files were made

Originals are not kept in the repository. Each variant is the original cropped to the
aspect ratio below (centre of interest kept), resized to the width in its file name, and
encoded as AVIF (quality 48) and WebP (quality 72), without metadata:

- city photos: 3:2, widths 480, 960 and 1600
- family photo: 4:5, widths 400, 800 and 1200
- team photo: original ratio, widths 320 and 640 (the source is 640 px wide)
