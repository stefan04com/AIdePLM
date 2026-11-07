// Loads GET /usage for the current run and for all runs. Refetches whenever the run
// changes status or finishes a step, i.e. right after each AI call was logged.

import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Run, UsageSummary } from '../api/types'

export interface Usage {
  run: UsageSummary | null
  all: UsageSummary | null
}

export function useUsage(run: Run | null): Usage {
  const [usage, setUsage] = useState<Usage>({ run: null, all: null })
  const runId = run?.id ?? null
  const status = run?.status
  const idle = run?.step == null

  useEffect(() => {
    if (!idle) return
    let cancelled = false
    Promise.all([runId ? api.getUsage(runId) : Promise.resolve(null), api.getUsage()])
      .then(([forRun, all]) => {
        if (!cancelled) setUsage({ run: forRun, all })
      })
      .catch(() => {
        // The cost panel is informational: never show an error banner for it.
      })
    return () => {
      cancelled = true
    }
  }, [runId, status, idle])

  return usage
}
