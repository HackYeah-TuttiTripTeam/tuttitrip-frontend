// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Profile } from '@/api/queries/profiles'
import { m } from '@/paraglide/messages'
import { AddPersonForm, EditPersonForm } from './person-form'

afterEach(cleanup)

const kid: Profile = {
  id: 'kid',
  trip_id: 't',
  display_name: 'Kasia',
  age: 6,
  age_group: 'child',
  user_sub: null,
  weight: 1,
  segment_km: 1,
  daily_km: 4,
  active_min: 300,
  stairs_sensitivity: 0.6,
  queue_patience_min: 15,
  nap_start: '13:00:00',
  nap_minutes: 60,
  floor: 30,
  customized_fields: [],
}

describe('AddPersonForm', () => {
  it('sends only the name and the age', async () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const }))
    render(<AddPersonForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText(m.people_form_name_label()), 'Kasia')
    await userEvent.type(screen.getByLabelText(m.people_form_age_label()), '6')
    await userEvent.click(screen.getByRole('button', { name: m.people_form_add_submit() }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ display_name: 'Kasia', age: 6 }))
  })

  it('asks for a name and an age before sending', async () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const }))
    render(<AddPersonForm onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: m.people_form_add_submit() }))
    expect(await screen.findByText(m.people_form_name_required())).toBeTruthy()
    expect(screen.getByText(m.people_form_age_invalid())).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows the message of a failed save', async () => {
    const onSubmit = vi.fn(async () => ({ ok: false as const, message: 'Nope' }))
    render(<AddPersonForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText(m.people_form_name_label()), 'Kasia')
    await userEvent.type(screen.getByLabelText(m.people_form_age_label()), '6')
    await userEvent.click(screen.getByRole('button', { name: m.people_form_add_submit() }))
    expect((await screen.findByRole('alert')).textContent).toBe('Nope')
  })
})

describe('EditPersonForm', () => {
  it('starts with the values the server set', () => {
    render(<EditPersonForm profile={kid} onSubmit={vi.fn()} />)
    const daily = screen.getByLabelText(m.people_form_daily_label()) as HTMLInputElement
    expect(daily.value).toBe('4')
    expect((screen.getByLabelText(m.people_form_active_label()) as HTMLInputElement).value).toBe(
      '5',
    )
  })

  it('refuses a single walk longer than the daily distance', async () => {
    const onSubmit = vi.fn()
    render(<EditPersonForm profile={kid} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(m.people_form_segment_label()), {
      target: { value: '9' },
    })
    await userEvent.click(screen.getByRole('button', { name: m.people_form_edit_submit() }))
    expect(await screen.findByText(m.people_form_segment_over_daily())).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('asks twice before removing a person', async () => {
    const onDelete = vi.fn(async () => ({ ok: true as const }))
    render(<EditPersonForm profile={kid} onSubmit={vi.fn()} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: m.people_delete() }))
    expect(onDelete).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: m.people_delete_yes() }))
    expect(onDelete).toHaveBeenCalledOnce()
  })
})
