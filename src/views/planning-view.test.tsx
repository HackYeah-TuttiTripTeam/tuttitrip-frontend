// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'
import { overwriteGetLocale } from '@/paraglide/runtime'

// The page has two dozen fields; a loaded machine needs more than the 1 s default.
vi.setConfig({ testTimeout: 30_000 })

const eventually = <T,>(check: () => T) => waitFor(check, { timeout: 8000 })

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement
const saveButton = () =>
  screen.getByRole('button', { name: m.planning_save() }) as HTMLButtonElement

describe('who may open the page', () => {
  it('shows an administrator the parameters in force', async () => {
    useScenario('planning-admin')
    renderApp('/admin/planning')
    await eventually(() => screen.getByText(m.planning_in_force_line({ version: 3 })))
    expect(screen.getByRole('heading', { level: 1, name: m.planning_title() })).toBeTruthy()
    expect(field(m.planning_param_alpha_name()).value).toBe('1.5')
    expect(field(m.planning_param_cost_comfort_name()).value).toBe('60')
    expect(screen.getByText(m.planning_uncalibrated())).toBeTruthy()
  })

  it('shows a reader the values but no way to change them', async () => {
    useScenario('planning-readonly')
    renderApp('/admin/planning')
    await eventually(() => screen.getByText(m.planning_readonly()))
    expect(field(m.planning_param_alpha_name()).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: m.planning_save() })).toBeNull()
    expect(screen.queryByRole('button', { name: m.planning_load({ version: 1 }) })).toBeNull()
  })
})

describe('changing a parameter', () => {
  it('disables saving for a value outside the range', async () => {
    useScenario('planning-admin')
    renderApp('/admin/planning')
    await eventually(() => screen.getByText(m.planning_in_force_line({ version: 3 })))
    expect(saveButton().disabled).toBe(true)

    fireEvent.change(field(m.planning_param_alpha_name()), { target: { value: '3.5' } })
    await eventually(() => screen.getByText(m.planning_error_range({ range: '0 do 3' })))
    expect(saveButton().disabled).toBe(true)

    fireEvent.change(field(m.planning_param_alpha_name()), { target: { value: '2' } })
    await waitFor(() => expect(saveButton().disabled).toBe(false))
  })

  it('stores a new version and says new plans will use it', async () => {
    useScenario('planning-admin')
    renderApp('/admin/planning')
    await eventually(() => screen.getByText(m.planning_in_force_line({ version: 3 })))

    fireEvent.change(field(m.planning_param_alpha_name()), { target: { value: '2' } })
    fireEvent.change(field(m.planning_note_label()), { target: { value: 'więcej równości' } })
    await waitFor(() => expect(saveButton().disabled).toBe(false))
    fireEvent.click(saveButton())

    expect(await eventually(() => screen.getByText(m.planning_saved({ version: 4 })))).toBeTruthy()
    expect(screen.getByText(m.planning_in_force_line({ version: 4 }))).toBeTruthy()
    const history = screen.getByRole('region', { name: m.planning_history_title() })
    expect(await eventually(() => within(history).getByText('więcej równości'))).toBeTruthy()
    expect(within(history).getByText(m.planning_version({ version: 4 }))).toBeTruthy()
    expect(saveButton().disabled).toBe(true)
  })

  it('puts the built-in value back with one click', async () => {
    useScenario('planning-admin')
    renderApp('/admin/planning')
    await eventually(() => screen.getByText(m.planning_in_force_line({ version: 3 })))
    fireEvent.click(
      screen.getAllByRole('button', { name: m.planning_restore({ value: '1' }) })[0] as HTMLElement,
    )
    await waitFor(() => expect(field(m.planning_param_alpha_name()).value).toBe('1'))
  })

  it('loads an older version into the form without storing anything', async () => {
    useScenario('planning-admin')
    renderApp('/admin/planning')
    await eventually(() => screen.getByText(m.planning_in_force_line({ version: 3 })))
    fireEvent.click(
      await eventually(() => screen.getByRole('button', { name: m.planning_load({ version: 1 }) })),
    )
    expect(await eventually(() => screen.getByText(m.planning_loaded({ version: 1 })))).toBeTruthy()
    expect(field(m.planning_param_cost_comfort_name()).value).toBe('50')
    expect(screen.getByText(m.planning_in_force_line({ version: 3 }))).toBeTruthy()
  })
})

describe('history', () => {
  it('lists the versions with author, time and note, newest first', async () => {
    useScenario('planning-admin')
    renderApp('/admin/planning')
    const history = await eventually(() =>
      screen.getByRole('region', { name: m.planning_history_title() }),
    )
    const versions = await eventually(() => within(history).getAllByText(/^(Wersja|Version) \d$/))
    expect(versions.map((node) => node.textContent)).toEqual([
      m.planning_version({ version: 3 }),
      m.planning_version({ version: 2 }),
      m.planning_version({ version: 1 }),
    ])
    expect(within(history).getByText('θ w górę, za często prosimy o zgodę')).toBeTruthy()
    expect(within(history).getByText(m.planning_in_force())).toBeTruthy()
  })

  it('keeps the page and size of the list in the URL', async () => {
    useScenario('planning-admin')
    const { router } = renderApp('/admin/planning?size=10&page=1')
    await eventually(() => screen.getByText(m.planning_in_force_line({ version: 3 })))
    expect(router.state.location.search).toMatchObject({ size: 10 })
  })
})

describe('language', () => {
  it('speaks English when the language is English', async () => {
    overwriteGetLocale(() => 'en')
    useScenario('planning-admin')
    renderApp('/admin/planning')
    expect(
      await eventually(() =>
        screen.getByRole('heading', { level: 1, name: 'Algorithm parameters' }),
      ),
    ).toBeTruthy()
    await eventually(() => screen.getByText('Version 3 is in force.'))
    expect(screen.getByLabelText('Fairness slider (α)')).toBeTruthy()
  })
})

describe('without the permission', () => {
  it('sends somebody without the permission to the trips', async () => {
    const { router } = renderApp('/admin/planning')
    await waitFor(() => expect(router.state.location.pathname).toBe('/trips'))
  })
})
