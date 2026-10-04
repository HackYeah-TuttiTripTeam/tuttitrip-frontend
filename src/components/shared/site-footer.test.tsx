// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GITHUB_ORG_URL, ISSUES_URL } from '@/lib/links'
import { overwriteGetLocale } from '@/paraglide/runtime'
import { SiteFooter } from './site-footer'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

const LANGUAGE = { locale: 'pl' as const, onChange: vi.fn() }

function linkNames(nav: HTMLElement) {
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent?.replace(/\(.*\)$/, '').trim())
}

describe('SiteFooter', () => {
  it('lists the link columns, the description and the HackYeah note in Polish', () => {
    overwriteGetLocale(() => 'pl')
    render(<SiteFooter language={LANGUAGE} />)
    const nav = screen.getByRole('navigation', { name: 'Informacje o serwisie' })

    expect(linkNames(nav)).toEqual([
      'Jak to działa',
      'Miara sprawiedliwości',
      'Co jest w środku',
      'O nas',
      'GitHub zespołu',
      'Prywatność',
      'Licencja Unsplash',
      'Kontakt',
      'Zgłoś problem',
    ])
    for (const title of ['Produkt', 'Zespół', 'Prywatność i licencje', 'Kontakt']) {
      expect(within(nav).getAllByText(title).length).toBeGreaterThan(0)
    }
    expect(screen.getByText(/Planer wyjazdów rodzinnych i grupowych/)).toBeTruthy()
    expect(screen.getByText(/HackYeah 2026, Kraków/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /polski/i })).toBeTruthy()
  })

  it('renders the same columns in English and links out to the team repository', () => {
    overwriteGetLocale(() => 'en')
    render(<SiteFooter language={{ ...LANGUAGE, locale: 'en' }} />)
    const nav = screen.getByRole('navigation', { name: 'About this site' })

    expect(linkNames(nav)).toEqual([
      'How it works',
      'Fairness measure',
      "What's inside",
      'About',
      'The team on GitHub',
      'Privacy',
      'Unsplash licence',
      'Contact',
      'Report a problem',
    ])
    expect(screen.getByRole('link', { name: /The team on GitHub/ }).getAttribute('href')).toBe(
      GITHUB_ORG_URL,
    )
    expect(screen.getByRole('link', { name: /Report a problem/ }).getAttribute('href')).toBe(
      ISSUES_URL,
    )
  })
})
