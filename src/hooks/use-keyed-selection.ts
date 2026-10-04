import type { RowSelectionState } from '@tanstack/react-table'
import { useState } from 'react'

interface Selection {
  key: string
  rows: RowSelectionState
  allMatching: boolean
}

/**
 * Ticked rows of a list view. The selection belongs to the page it was made on: when `key` (the
 * page, size, sort and filters) changes, it reads as empty, so "all matching" always means the
 * set on screen. Not in the URL: it can hold many ids and does not describe the list.
 */
export function useKeyedSelection(key: string) {
  const [state, setState] = useState<Selection>({ key, rows: {}, allMatching: false })
  const current = state.key === key ? state : { key, rows: {}, allMatching: false }

  return {
    rows: current.rows,
    ids: Object.keys(current.rows).filter((id) => current.rows[id]),
    allMatching: current.allMatching,
    setRows: (rows: RowSelectionState) => setState({ key, rows, allMatching: false }),
    selectAllMatching: () => setState({ ...current, allMatching: true }),
    clear: () => setState({ key, rows: {}, allMatching: false }),
  }
}
