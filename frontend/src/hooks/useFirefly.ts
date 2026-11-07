// State of the Firefly mock for one run: idle → generating (step labels) → generated (the post shows
// the new image) → back to the original on undo. Resets when the run changes. Replace `generate` with
// a real API call when Firefly is connected.

import { useEffect, useState } from 'react'
import { FIREFLY_IMAGE, FIREFLY_TOTAL_MS, fireflyStepAt } from '../lib/firefly'

const TICK_MS = 150

interface State {
  runId: string | null
  startedAt: number | null
  done: boolean
}

const fresh = (runId: string | null): State => ({ runId, startedAt: null, done: false })

export function useFirefly(runId: string | null) {
  const [state, setState] = useState<State>(fresh(runId))
  const [now, setNow] = useState(0)

  // A different run starts from scratch.
  if (state.runId !== runId) setState(fresh(runId))
  const { startedAt, done } = state

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
    /** The generated image once the call is done, else null (the post keeps its own image). */
    image: done ? FIREFLY_IMAGE : null,
    generate: () => {
      setNow(0)
      setState({ runId, startedAt: Date.now(), done: false })
    },
    undo: () => setState(fresh(runId)),
  }
}

export type Firefly = ReturnType<typeof useFirefly>
