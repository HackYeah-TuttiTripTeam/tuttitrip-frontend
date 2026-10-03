// Single source of Paraglide's options: used by scripts/i18n.mjs (pnpm i18n) and vite.config.ts.
export const paraglideOptions = {
  project: './project.inlang',
  outdir: './src/paraglide',
  strategy: ['localStorage', 'preferredLanguage', 'baseLocale'],
  emitTsDeclarations: true,
}
