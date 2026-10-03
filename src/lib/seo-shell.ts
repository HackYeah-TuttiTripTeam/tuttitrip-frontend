// The first screen of each public page as plain HTML, put into #root by the Worker
// (worker/index.ts). The app is a client-rendered SPA: until its scripts have run nothing is on
// screen, and for a visitor on a phone that is several seconds. This markup shows the headline,
// the lede and the first photo at once, and is also what a crawler without JavaScript reads.
// React replaces it when it mounts, so the class names must stay the same as in
// components/public (landing-sections, about-sections, contact-body): same classes, same size,
// no jump. Only the pieces that are above the fold on a phone are here.
import { m } from '../paraglide/messages'
import type { Locale } from '../paraglide/runtime'
import { PHOTOS, type PhotoId, photoPath } from './photo-data'
import type { SeoPath } from './seo'

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`)

const SECTION = 'mx-auto w-full max-w-5xl px-4 md:px-6'

function picture(id: PhotoId, alt: string, sizes: string, imgClass: string): string {
  const photo = PHOTOS[id]
  const set = (format: 'avif' | 'webp') =>
    photo.widths.map((w) => `${photoPath(photo.file, w, format)} ${w}w`).join(', ')
  const middle = photo.widths[Math.floor(photo.widths.length / 2)] ?? photo.widths[0] ?? 0
  return (
    `<picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">` +
    `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">` +
    `<img src="${photoPath(photo.file, middle, 'webp')}" alt="${escapeHtml(alt)}" width="${photo.width}" ` +
    `height="${photo.height}" sizes="${sizes}" decoding="async" fetchpriority="high" ` +
    `class="block h-auto w-full ${imgClass}"></picture>`
  )
}

function frame(content: string): string {
  // The 65px stands for the sticky header the app draws above the page (h-16 and its border).
  return (
    `<div id="seo-shell" data-seo class="flex min-h-svh flex-col bg-background text-foreground">` +
    `<div style="height:65px"></div><main class="flex-1">${content}</main></div>`
  )
}

/** Hides the shell for a browser with a stored session: it is sent on to /trips, not to the landing page. */
const HIDE_FOR_SIGNED_IN =
  `<script data-seo>try{for(var i=0;i<localStorage.length;i++)` +
  `if((localStorage.key(i)||'').indexOf('@@auth0spajs@@')===0){` +
  `document.getElementById('seo-shell').style.display='none';break}}catch(e){}</script>`

/**
 * Preloads for the shell: the two fonts it is set in. With them in hand at the first paint the
 * headline has its final size at once, so the app's own headline (same text, same size) is not a
 * larger paint that moves the page's LCP to when the scripts finish.
 */
export const SHELL_PRELOADS = ['FunnelDisplay-Variable', 'AtkinsonHyperlegibleNext-Variable']
  .map(
    (font) =>
      `<link data-seo rel="preload" as="font" type="font/woff2" crossorigin href="/assets/fonts/${font}.woff2">`,
  )
  .join('')

export function shellHtml(path: SeoPath, locale: Locale): string {
  const o = { locale }
  if (path === '/') {
    return (
      frame(
        `<section class="${SECTION} grid items-center gap-10 py-10 md:grid-cols-[1.1fr_0.9fr] md:gap-14 md:py-20">` +
          `<div class="flex flex-col gap-5 md:gap-6">` +
          `<h1 class="text-balance font-extrabold text-4xl leading-[1.05] tracking-tight md:text-6xl">${escapeHtml(m.home_title({}, o))}</h1>` +
          `<p class="max-w-prose text-lg text-muted-foreground leading-relaxed">${escapeHtml(m.home_lede({}, o))}</p>` +
          `</div></section>`,
      ) + HIDE_FOR_SIGNED_IN
    )
  }
  if (path === '/about') {
    return frame(
      `<section class="${SECTION} grid items-center gap-8 py-10 md:grid-cols-[1.15fr_0.85fr] md:gap-16 md:py-20">` +
        `<div class="flex flex-col gap-5">` +
        `<h1 class="text-balance font-extrabold text-4xl leading-[1.05] tracking-tight md:text-5xl">${escapeHtml(m.about_title({}, o))}</h1>` +
        `<p class="max-w-prose text-lg text-muted-foreground leading-relaxed">${escapeHtml(m.about_lede({}, o))}</p></div>` +
        `<figure class="flex flex-col gap-2"><div class="overflow-hidden rounded-lg border">` +
        picture(
          'rodzina',
          m.photo_rodzina_alt({}, o),
          '(min-width: 768px) 38vw, 100vw',
          'aspect-[16/10] object-cover object-[50%_60%] md:aspect-[4/5]',
        ) +
        `</div></figure></section>`,
    )
  }
  const team = PHOTOS.zespol
  return frame(
    `<section class="${SECTION} grid items-center gap-10 py-10 md:grid-cols-[1fr_1.1fr] md:gap-16 md:py-20">` +
      `<div class="flex flex-col items-start gap-5">` +
      `<h1 class="font-extrabold text-4xl leading-[1.05] tracking-tight md:text-5xl">${escapeHtml(m.contact_title({}, o))}</h1>` +
      `<p class="max-w-prose text-lg text-muted-foreground leading-relaxed">${escapeHtml(m.contact_lede({}, o))}</p></div>` +
      `<figure class="flex flex-col gap-3"><div class="overflow-hidden rounded-lg border" style="aspect-ratio:${team.width} / ${team.height}">` +
      picture('zespol', m.contact_photo_alt({}, o), '(min-width: 768px) 50vw, 100vw', '') +
      `</div></figure></section>`,
  )
}
