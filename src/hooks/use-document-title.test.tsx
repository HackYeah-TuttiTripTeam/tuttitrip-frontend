// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDocumentTitle } from './use-document-title'

describe('useDocumentTitle', () => {
  it('sets "Page · TuttiTrip" and puts the site name back when the page unmounts', () => {
    const { unmount } = renderHook(() => useDocumentTitle('O nas'))
    expect(document.title).toBe('O nas · TuttiTrip')
    unmount()
    expect(document.title).toBe('TuttiTrip')
  })

  it('uses the site name alone without a page name', () => {
    renderHook(() => useDocumentTitle())
    expect(document.title).toBe('TuttiTrip')
  })
})
