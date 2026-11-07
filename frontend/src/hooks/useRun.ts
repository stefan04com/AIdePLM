// Polls GET /runs/{id} every second (ADR-004) until the run reaches a terminal
// status. Uses a setTimeout chain, so a slow response never overlaps the next poll.

import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Run, RunStatus } from '../api/types'

const POLL_MS = 1000
const TERMINAL: RunStatus[] = ['SHIPPED', 'REJECTED']

export function useRun(runId: string | null) {
  const [run, setRun] = useState<Run | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!runId) return
    try {
      setRun(await api.getRun(runId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [runId])

  const isTerminal = run !== null && TERMINAL.includes(run.status)

  useEffect(() => {
    if (!runId || isTerminal) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const tick = async () => {
      await refresh()
      if (!cancelled) timer = setTimeout(tick, POLL_MS)
    }
    void tick()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [runId, isTerminal, refresh])

  return { run, error, refresh, setRun }
}
