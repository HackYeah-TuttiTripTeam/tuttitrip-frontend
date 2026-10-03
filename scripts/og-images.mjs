#!/usr/bin/env node
// Builds the 1200x630 share images (public/og/og-<lang>.png) from the design tokens, the
// Horyzont mark and the pitch deck's visual language: paper background, a dotted route to
// the goal ring, one flat sheet. Texts come from messages/*.json, fonts from src/styles/fonts.
// Needs a Chromium: CHROME=/path/to/chrome node scripts/og-images.mjs
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const chrome = process.env.CHROME
if (!chrome) throw new Error('Set CHROME to a Chromium/Chrome binary')

const root = resolve(import.meta.dirname, '..')
const fonts = join(root, 'src/styles/fonts')
const outDir = join(root, 'public/og')
mkdirSync(outDir, { recursive: true })

// Mark of the new logo (Horyzont), geometry from the design system pack.
const mark = `<svg viewBox="0 0 512 512" width="96" height="96"><circle cx="256" cy="256" r="256" fill="#0a2f23"/><defs><clipPath id="k"><circle cx="256" cy="256" r="256"/></clipPath></defs><g clip-path="url(#k)"><rect x="0" y="256" width="512" height="274" fill="#00774d"/><path d="M256 256L126 520H386Z" fill="#f5efe6"/><path d="M254.35 282.40L257.64 282.40L258.01 293.66L253.99 293.66Z" fill="#0a2f23"/><path d="M253.63 304.93L258.37 304.93L259.03 325.81L252.97 325.81Z" fill="#0a2f23"/><path d="M252.30 346.69L259.70 346.69L260.94 385.38L251.06 385.38Z" fill="#0a2f23"/><path d="M249.82 424.08L262.18 424.08L264.48 495.80L247.52 495.80Z" fill="#0a2f23"/></g><circle cx="256" cy="146" r="48" fill="#0a2f23" stroke="#f2b53a" stroke-width="28"/></svg>`

const page = (title, lede) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Funnel;src:url("file://${fonts}/FunnelDisplay-Variable.woff2");font-weight:300 800}
@font-face{font-family:Atkinson;src:url("file://${fonts}/AtkinsonHyperlegibleNext-Variable.woff2");font-weight:200 800}
:root{--bg:oklch(98.6% .005 165);--ink:oklch(21% .02 170);--muted:oklch(48% .02 170);--route:oklch(78% .015 168);--primary:oklch(50% .12 162);--card:#fff;--line:oklch(90% .01 165);
--m1:oklch(50% .11 250);--m2:oklch(50% .12 295);--m3:oklch(52% .09 210);--m4:oklch(52% .13 355);--m5:oklch(52% .09 115)}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:var(--bg);color:var(--ink);font-family:Atkinson,sans-serif;position:relative;overflow:hidden}
.brand{position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:20px;font:800 44px/1 Funnel;letter-spacing:-.035em}
h1{position:absolute;left:72px;top:190px;width:640px;font:800 68px/1.04 Funnel;letter-spacing:-.025em;text-wrap:balance}
p{position:absolute;left:72px;top:440px;width:600px;font:400 27px/1.4 Atkinson;color:var(--muted)}
.sheet{position:absolute;right:72px;top:150px;width:360px;height:340px;background:var(--card);border:2px solid var(--line);border-radius:28px;padding:34px 34px 14px}
.row{position:relative;height:50px;margin-bottom:12px}
.row i{position:absolute;left:0;right:44px;top:24px;height:2px;background:radial-gradient(circle,var(--route) 1.6px,transparent 2.2px) 0 50%/8px 4px repeat-x}
.row b{position:absolute;top:9px;width:32px;height:32px;border-radius:50%;border:3px solid var(--card)}
.row u{position:absolute;right:0;top:12px;width:26px;height:26px;border-radius:50%;border:5px solid var(--primary)}
</style></head><body>
<div class="brand">${mark}<span>TuttiTrip</span></div>
<h1>${title}</h1><p>${lede}</p>
<div class="sheet">
${[
  ['--m1', 78],
  ['--m2', 64],
  ['--m3', 70],
  ['--m4', 58],
  ['--m5', 66],
]
  .map(
    ([c, x]) =>
      `<div class="row"><i></i><u></u><b style="left:calc(${x}% - 24px);background:var(${c})"></b></div>`,
  )
  .join('')}
</div>
</body></html>`

for (const lang of ['pl', 'en']) {
  const msg = JSON.parse(readFileSync(join(root, `messages/${lang}.json`), 'utf8'))
  const html = join(tmpdir(), `tuttitrip-og-${lang}.html`)
  writeFileSync(html, page(msg.home_title, `${msg.home_lede.split('. ')[0].replace(/\.$/, '')}.`))
  execFileSync(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    '--allow-file-access-from-files',
    '--virtual-time-budget=2000',
    `--screenshot=${join(outDir, `og-${lang}.png`)}`,
    `file://${html}`,
  ])
}
