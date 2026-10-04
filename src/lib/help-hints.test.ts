import { describe, expect, it } from 'vitest'
import { HELP_HINTS, type HelpHintId } from './help-hints'

const TOPICS = Object.keys(HELP_HINTS) as HelpHintId[]

describe('HELP_HINTS', () => {
  it.each(TOPICS)('%s is translated into Polish and English', (id) => {
    const { title, body } = HELP_HINTS[id]
    for (const text of [title, body]) {
      const pl = text({}, { locale: 'pl' })
      const en = text({}, { locale: 'en' })
      expect(pl.length).toBeGreaterThan(2)
      expect(en.length).toBeGreaterThan(2)
      expect(pl).not.toBe(en)
    }
  })
})
