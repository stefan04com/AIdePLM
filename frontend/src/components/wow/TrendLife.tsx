import { useEffect, useState } from 'react'
import type { Run, Trend } from '../../api/types'
import { formatLife, TREND_LIFE_HOURS, trendLifeLeft } from '../../lib/wow'

const TICK_MS = 15_000

/** Header hourglass: how long this trend has left (avg 11.9 h in a top-50 list), frozen at ship. */
export function TrendLife({ trend, run }: { trend: Trend | null; run: Run | null }) {
  const [now, setNow] = useState(Date.now)
  const shippedAt = run?.shipped_at ? Date.parse(run.shipped_at) : null

  useEffect(() => {
    if (shippedAt) return
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [shippedAt])

  if (!trend) return null
  const left = trendLifeLeft(trend.detected_at, shippedAt ?? now)
  const share = Math.max(0, Math.min(1, left / (TREND_LIFE_HOURS * 3_600_000)))
  const label = shippedAt ? `shipped with ${formatLife(left)} left` : `${formatLife(left)} left`
  return (
    <div
      className={`trend-life ${shippedAt ? 'is-shipped' : ''} ${left <= 0 ? 'is-over' : ''}`}
      title="Average time a trend stays in a top-50 list: 11.9 h (Lorenz-Spreen et al., 2019)"
    >
      <span className="trend-life-label">Trend life</span>
      <span className="trend-life-bar" aria-hidden>
        <span style={{ width: `${share * 100}%` }} />
      </span>
      <span className="trend-life-value">{label}</span>
    </div>
  )
}
