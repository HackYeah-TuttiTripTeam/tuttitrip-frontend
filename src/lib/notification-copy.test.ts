import { describe, expect, it } from 'vitest'
import { notification } from '@/mocks/fixtures'
import { overwriteGetLocale } from '@/paraglide/runtime'
import { formatRelative } from './format'
import { resolveActions } from './notification-actions'
import {
  describeNotification,
  NOTIFICATION_TYPES,
  notificationTypeLabel,
} from './notification-copy'

describe('describeNotification', () => {
  it('writes title and body in the language of the interface', () => {
    const joined = notification({ type: 'member_joined', params: { member_name: 'Anna' } })
    overwriteGetLocale(() => 'pl')
    expect(describeNotification(joined)).toMatchObject({
      title: 'Nowa osoba w wyjeździe',
      body: 'Nowy członek: Anna',
      icon: 'member_joined',
    })
    overwriteGetLocale(() => 'en')
    expect(describeNotification(joined)).toMatchObject({
      title: 'New person on the trip',
      body: 'New member: Anna',
    })
  })

  it('reads as a neutral sentence when a param is missing', () => {
    overwriteGetLocale(() => 'pl')
    const { body } = describeNotification(notification({ type: 'member_joined', params: {} }))
    expect(body).toBe('Ktoś dołączył do wyjazdu.')
  })

  it('has a title for every known type and a fallback for an unknown one', () => {
    overwriteGetLocale(() => 'pl')
    for (const type of NOTIFICATION_TYPES) {
      expect(describeNotification({ type, params: {} }).title).not.toBe('')
      expect(notificationTypeLabel(type)).not.toBe('')
    }
    expect(describeNotification({ type: 'from_the_future', params: {} })).toMatchObject({
      title: 'Nowe powiadomienie',
      icon: 'unknown',
    })
    expect(notificationTypeLabel('from_the_future')).toBe('Inne')
  })
})

describe('resolveActions', () => {
  it('maps navigation codes to a tab of the trip and skips the ones not supported yet', () => {
    overwriteGetLocale(() => 'pl')
    const actions = resolveActions({
      trip_id: 'trip-1',
      actions: [
        { code: 'approve_proposal', params: {} },
        { code: 'open_plan', params: {} },
        { code: 'open_people', params: { trip_id: 'trip-2' } },
      ],
    })
    expect(actions.map(({ code, target }) => [code, target])).toEqual([
      ['open_plan', { tripId: 'trip-1', tab: 'plan' }],
      ['open_people', { tripId: 'trip-2', tab: 'people' }],
    ])
  })

  it('has nothing to open without a trip', () => {
    expect(resolveActions({ trip_id: null, actions: [{ code: 'open_trip', params: {} }] })).toEqual(
      [],
    )
  })
})

describe('formatRelative', () => {
  const now = Date.parse('2026-10-04T12:00:00Z')
  it('picks the largest fitting unit, per language', () => {
    overwriteGetLocale(() => 'en')
    expect(formatRelative('2026-10-04T11:55:00Z', now)).toBe('5 min. ago')
    expect(formatRelative('2026-10-04T09:00:00Z', now)).toBe('3 hr. ago')
    expect(formatRelative('2026-10-03T12:00:00Z', now)).toBe('yesterday')
    overwriteGetLocale(() => 'pl')
    expect(formatRelative('2026-10-04T11:55:00Z', now)).toBe('5 min temu')
  })
})
