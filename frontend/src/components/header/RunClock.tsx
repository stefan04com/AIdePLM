import type { Run } from '../../api/types'
import { useNow } from '../../hooks/useNow'
import { formatElapsed } from '../../lib/format'
import { Badge } from '../ui'

/** "Trend → now 3m 12s" while the run is open, "Trend → approved 4m 05s" once shipped. */
export function RunClock({ run }: { run: Run }) {
  const shipped = run.shipped_at !== null
  const now = useNow(!shipped && run.status !== 'REJECTED')
  const elapsed = formatElapsed(run.started_at, run.shipped_at ?? now)

  return (
    <Badge tone={shipped ? 'ok' : 'neutral'}>
      Trend → {shipped ? 'approved' : 'now'} <strong className="clock">{elapsed}</strong>
    </Badge>
  )
}
