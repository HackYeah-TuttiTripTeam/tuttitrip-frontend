import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Regenerate icons after changing public/logo.svg: pnpm run pwa:icons
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#00774d' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#00774d' } },
  },
  images: ['public/logo.svg'],
})
