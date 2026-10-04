// @vitest-environment jsdom
// The inline language script in index.html (#74), run as the browser runs it.
import { beforeEach, describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import { injectDescriptions } from '../../pwa.config'

const PL = 'opis pl'
const EN = 'desc en'
const script =
  [...injectDescriptions(indexHtml, { pl: PL, en: EN }).matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1] ?? '')
    .find((code) => code.includes('PARAGLIDE_LOCALE')) ?? ''

const root = document.documentElement
const run = () => new Function(script)()

function page(head: string, attrs = '') {
  document.head.innerHTML = head
  for (const a of [...root.attributes]) root.removeAttribute(a.name)
  root.setAttribute('lang', 'pl')
  for (const [k, v] of Object.entries(Object.fromEntries(new URLSearchParams(attrs)))) {
    root.setAttribute(k, v)
  }
}
const meta = () => document.querySelector<HTMLMetaElement>('meta[name=description]')
const setUrl = (search: string) => history.replaceState(null, '', `/${search}`)
const setLanguages = (languages: string[]) =>
  Object.defineProperty(navigator, 'languages', { value: languages, configurable: true })

beforeEach(() => {
  localStorage.clear()
  setUrl('')
  setLanguages(['pl-PL'])
  page(`<meta name="description" content="${PL}">`)
})

describe('language script in index.html', () => {
  it('is found and carries both texts', () => {
    expect(script).toContain(PL)
    expect(script).toContain(EN)
  })

  it('follows ?lang, then the stored choice, then the browser', () => {
    setLanguages(['en-GB'])
    run()
    expect([root.lang, meta()?.content]).toEqual(['en', EN])
    localStorage.setItem('PARAGLIDE_LOCALE', 'pl')
    run()
    expect(root.lang).toBe('pl')
    setUrl('?lang=en')
    run()
    expect(root.lang).toBe('en')
  })

  it('ignores prototype keys and unknown languages', () => {
    for (const value of ['__proto__', 'constructor', 'toString', 'de']) {
      setUrl(`?lang=${value}`)
      localStorage.setItem('PARAGLIDE_LOCALE', value)
      setLanguages(['de'])
      expect(run).not.toThrow()
      expect(root.lang).toBe('pl')
      expect(meta()?.content).toBe(PL)
    }
  })

  it('does not throw without a description tag', () => {
    page('')
    setUrl('?lang=en')
    expect(run).not.toThrow()
    expect(root.lang).toBe('en')
  })

  it('leaves a public page alone: the Worker marks <html data-seo> and owns lang and description', () => {
    page('', 'data-seo=')
    root.setAttribute('lang', 'en')
    setLanguages(['pl'])
    localStorage.setItem('PARAGLIDE_LOCALE', 'pl')
    expect(run).not.toThrow()
    expect(root.lang).toBe('en')
  })
})
