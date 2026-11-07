// Tracks which Referee compromises the user accepted. Resets automatically when the
// Referee runs again and returns different conflicts.

import { useState } from 'react'
import type { Conflict } from '../api/types'

const NONE: ReadonlySet<string> = new Set()

const conflictsKey = (conflicts: Conflict[]) =>
  conflicts.map((c) => `${c.id}:${c.compromise}`).join('|')

export function useAcceptedConflicts(conflicts: Conflict[]) {
  const key = conflictsKey(conflicts)
  const [state, setState] = useState<{ key: string; ids: ReadonlySet<string> }>({ key, ids: NONE })
  const accepted = state.key === key ? state.ids : NONE

  const toggle = (conflictId: string) =>
    setState((prev) => {
      const next = new Set(prev.key === key ? prev.ids : NONE)
      if (next.has(conflictId)) next.delete(conflictId)
      else next.add(conflictId)
      return { key, ids: next }
    })

  const acceptAll = () => setState({ key, ids: new Set(conflicts.map((c) => c.id)) })

  return {
    accepted,
    toggle,
    acceptAll,
    acceptedIds: conflicts.filter((c) => accepted.has(c.id)).map((c) => c.id),
  }
}
