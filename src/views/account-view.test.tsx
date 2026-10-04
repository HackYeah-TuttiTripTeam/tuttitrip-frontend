// @vitest-environment jsdom
import { configure, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

configure({ asyncUtilTimeout: 5000 })
vi.setConfig({ testTimeout: 20_000 })

describe('account settings', () => {
  it('renames an e-mail account and confirms', async () => {
    const bodies: unknown[] = []
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'PATCH' && request.url.endsWith('/me/account')) {
        bodies.push(await request.clone().json())
      }
    })
    const user = userEvent.setup()
    renderApp('/account')
    const field = await screen.findByLabelText<HTMLInputElement>(m.account_settings_name_label())
    const save = screen.getByRole('button', { name: m.account_settings_save() })
    expect((save as HTMLButtonElement).disabled).toBe(true)

    await user.clear(field)
    await user.type(field, 'Ola Nowak')
    await user.click(save)

    expect(await screen.findByText(m.account_settings_saved())).toBeTruthy()
    expect(bodies).toEqual([{ name: 'Ola Nowak' }])
  })

  it('refuses an empty name before asking the API', async () => {
    const user = userEvent.setup()
    renderApp('/account')
    const field = await screen.findByLabelText<HTMLInputElement>(m.account_settings_name_label())
    await user.clear(field)
    await user.type(field, '   ')
    await user.click(screen.getByRole('button', { name: m.account_settings_save() }))
    expect(await screen.findByText(m.account_settings_name_required())).toBeTruthy()
  })

  it('tells a Google account the data comes from Google and offers no form', async () => {
    useScenario('google-account')
    renderApp('/account')
    expect(
      await screen.findByText(
        m.account_settings_provider_managed({ provider: m.provider_google() }),
      ),
    ).toBeTruthy()
    expect(screen.queryByLabelText(m.account_settings_name_label())).toBeNull()
    await waitFor(() => expect(screen.getByText(m.provider_google())).toBeTruthy())
  })
})
