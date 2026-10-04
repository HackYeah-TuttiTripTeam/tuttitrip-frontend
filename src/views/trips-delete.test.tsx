// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

const NAME = 'Warszawa z rodziną'
const rowOf = (name: string) =>
  screen.getByRole('link', { name: m.trip_open_label({ name }), hidden: true }).closest('tr')
const deleteButton = (name: string) => m.trip_delete_row_label({ name })

describe('deleting from the trips list', () => {
  it('puts a delete button on each row the caller hosts, and only those', async () => {
    useScenario('many-trips')
    renderApp('/trips')
    await screen.findByText(m.list_range({ from: 1, to: 20, total: 45 }))
    const rows = screen.getAllByRole('row').slice(1)
    const hosted = rows.filter((row) =>
      within(row).queryByRole('button', { name: /^(Usuń|Delete) /u }),
    )
    expect(hosted.length).toBeGreaterThan(0)
    expect(hosted.length).toBeLessThan(rows.length)
  })

  it.each(['cohost', 'member-readonly'] as const)(
    'shows none to the %s scenario',
    async (scenario) => {
      useScenario(scenario)
      renderApp('/trips')
      await screen.findByRole('link', { name: m.trip_open_label({ name: NAME }) })
      expect(screen.queryByRole('button', { name: deleteButton(NAME) })).toBeNull()
    },
  )

  it('asks with the trip name, then removes the row only after confirming', async () => {
    useScenario('family-warsaw')
    renderApp('/trips')
    await screen.findByRole('link', { name: m.trip_open_label({ name: NAME }) })
    fireEvent.click(
      within(rowOf(NAME) as HTMLElement).getByRole('button', { name: deleteButton(NAME) }),
    )
    expect(await screen.findByText(m.trip_delete_body({ name: NAME }))).toBeTruthy()
    expect(rowOf(NAME)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: m.trip_delete_confirm() }))
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: m.trip_open_label({ name: NAME }) })).toBeNull(),
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps the dialog and says so when the API refuses', async () => {
    useScenario('family-warsaw', {
      tweak: (w) => {
        w.failures.delete = 500
      },
    })
    renderApp('/trips')
    await screen.findByRole('link', { name: m.trip_open_label({ name: NAME }) })
    fireEvent.click(screen.getByRole('button', { name: deleteButton(NAME) }))
    fireEvent.click(await screen.findByRole('button', { name: m.trip_delete_confirm() }))
    expect(await screen.findByText(m.trip_delete_failed())).toBeTruthy()
    expect(rowOf(NAME)).toBeTruthy()
  })
})
