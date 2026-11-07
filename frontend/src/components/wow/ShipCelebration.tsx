import { useEffect, useState } from 'react'
import type { Run } from '../../api/types'
import { formatElapsed } from '../../lib/format'
import { sound } from '../../lib/sound'
import { formatLife, REVIEW_DAYS, speedup, trendLifeLeft } from '../../lib/wow'

const SHOW_MS = 4200
const DROPS = 36

/** The demo's big moment: when a run ships in front of us, show how fast it went, over a honey rain. */
export function ShipCelebration({ run }: { run: Run | null }) {
  const [seen, setSeen] = useState(run?.status ?? null)
  const [shipped, setShipped] = useState<Run | null>(null)

  // Celebrate only a live REFEREED → SHIPPED change, never a reload of an old shipped run.
  const status = run?.status ?? null
  if (status !== seen) {
    if (run && status === 'SHIPPED' && seen === 'REFEREED') setShipped(run)
    setSeen(status)
  }

  useEffect(() => {
    if (!shipped) return
    sound.chord()
    const timer = setTimeout(() => setShipped(null), SHOW_MS)
    return () => clearTimeout(timer)
  }, [shipped])

  if (!shipped || !shipped.shipped_at) return null
  const elapsed = formatElapsed(shipped.started_at, shipped.shipped_at)
  const conflicts = shipped.referee?.conflicts.length ?? 0
  const faster = speedup(shipped.started_at, shipped.shipped_at).toLocaleString('en-US')
  const lifeLeft = formatLife(trendLifeLeft(shipped.trend.detected_at, Date.parse(shipped.shipped_at)))
  return (
    <div className="celebrate" role="status" aria-live="polite" onClick={() => setShipped(null)}>
      <div className="celebrate-rain" aria-hidden>
        {Array.from({ length: DROPS }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              animationDelay: `${(i % 12) * 0.08}s`,
              animationDuration: `${1.6 + (i % 5) * 0.25}s`,
              width: `${8 + (i % 4) * 4}px`,
              height: `${9 + (i % 4) * 4.5}px`,
            }}
          />
        ))}
      </div>
      <div className="celebrate-card">
        <span className="celebrate-check" aria-hidden>
          ✓
        </span>
        <p className="celebrate-kicker">Post approved</p>
        <p className="celebrate-time">{elapsed}</p>
        <p className="celebrate-sub">from trend to approved post</p>
        <p className="celebrate-faster">
          <strong>{faster}×</strong> faster than an {REVIEW_DAYS}-day review
          <span>, with {lifeLeft} of trend life left</span>
        </p>
        <div className="celebrate-stats">
          <span>
            <strong>{shipped.comments.length}</strong> reviewers
          </span>
          <span>
            <strong>{shipped.reactions.length}</strong> personas
          </span>
          <span>
            <strong>{conflicts}</strong> conflicts resolved
          </span>
        </div>
      </div>
    </div>
  )
}
