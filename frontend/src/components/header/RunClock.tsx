import type { Run } from '../../api/types'
import { useNow } from '../../hooks/useNow'
import { formatElapsed } from '../../lib/format'

/** Live badge: pulsing dot + "Trend → now 3m 12s"; turns green "Trend → approved" once shipped. */
export function RunClock({ run }: { run: Run }) {
  const shipped = run.shipped_at !== null
  const live = !shipped && run.status !== 'REJECTED'
  const now = useNow(live)
  const elapsed = formatElapsed(run.started_at, run.shipped_at ?? now)

  return (
    <span className={`live-badge ${shipped ? 'tone-ok' : ''}`}>
      <span className={`pulse-dot ${live ? 'pulsing' : ''}`} aria-hidden />
      Trend → {shipped ? 'approved' : 'now'} <strong className="clock">{elapsed}</strong>
    </span>
  )
}
