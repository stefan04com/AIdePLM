// State of the Firefly mock for one run: idle → generating (step labels) → two variations → picked.
// Resets when the run changes. Replace `generate` with a real API call when Firefly is connected.

import { useEffect, useState } from 'react'
import { FIREFLY_TOTAL_MS, fireflyStepAt, fireflyVariant } from '../lib/firefly'

const TICK_MS = 150

interface State {
  runId: string | null
  startedAt: number | null
  done: boolean
  pickedId: string | null
}

const fresh = (runId: string | null): State => ({ runId, startedAt: null, done: false, pickedId: null })

export function useFirefly(runId: string | null) {
  const [state, setState] = useState<State>(fresh(runId))
  const [now, setNow] = useState(0)

  // A different run starts from scratch.
  if (state.runId !== runId) setState(fresh(runId))
  const { startedAt, done, pickedId } = state

  useEffect(() => {
    if (startedAt === null || done) return
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt
      setNow(elapsed)
      if (elapsed >= FIREFLY_TOTAL_MS) setState((prev) => ({ ...prev, done: true }))
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [startedAt, done])

  const generating = startedAt !== null && !done
  return {
    generating,
    step: generating ? fireflyStepAt(now) : null,
    ready: done,
    picked: fireflyVariant(pickedId),
    generate: () => {
      setNow(0)
      setState({ runId, startedAt: Date.now(), done: false, pickedId: null })
    },
    pick: (id: string) => setState((prev) => ({ ...prev, pickedId: id })),
  }
}
