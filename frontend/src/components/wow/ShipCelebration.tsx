import { type CSSProperties, useEffect, useState } from 'react'
import type { Run } from '../../api/types'
import { formatElapsed } from '../../lib/format'
import { sound } from '../../lib/sound'
import { CELEBRATE_MS, formatLife, REVIEW_DAYS, shareOfReview, trendLifeLeft } from '../../lib/wow'

const RACE_START_MS = 500 // once the card has popped in
const DAY_MS = 330 // the typical review's calendar turns one page this often
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
    const timer = setTimeout(() => setShipped(null), CELEBRATE_MS)
    return () => clearTimeout(timer)
  }, [shipped])

  if (!shipped || !shipped.shipped_at) return null
  const elapsed = formatElapsed(shipped.started_at, shipped.shipped_at)
  const conflicts = shipped.referee?.conflicts.length ?? 0
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
        <ReviewRace elapsed={elapsed} share={shareOfReview(shipped.started_at, shipped.shipped_at)} />
        <p className="celebrate-faster">
          <strong>{elapsed}</strong> vs {REVIEW_DAYS} days for a typical review
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

/**
 * Two bars race: AdoBee is done before the typical review's calendar has turned its first page,
 * then the review crawls through its eight days.
 */
function ReviewRace({ elapsed, share }: { elapsed: string; share: number }) {
  const [day, setDay] = useState(0)

  useEffect(() => {
    let timer = 0
    const turn = (next: number) => {
      setDay(next)
      if (next < REVIEW_DAYS) timer = window.setTimeout(() => turn(next + 1), DAY_MS)
    }
    timer = window.setTimeout(() => turn(1), RACE_START_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="race" style={{ '--race-ms': `${REVIEW_DAYS * DAY_MS}ms` } as CSSProperties}>
      <div className="race-row race-adobee">
        <span className="race-label">AdoBee</span>
        <span className="race-track">
          <span className="race-bar" />
        </span>
        <span className="race-value">{elapsed} ✓</span>
      </div>
      <div className="race-row race-classic">
        <span className="race-label">Typical review</span>
        <span className="race-track">
          <span className="race-bar" />
        </span>
        <span className="race-value">
          <span key={day} className="race-day">
            Day {Math.max(day, 1)}
          </span>
        </span>
      </div>
      <p className="race-note">To scale, AdoBee&apos;s bar would be {share < 0.01 ? share.toFixed(4) : share.toFixed(2)}% of the review&apos;s.</p>
    </div>
  )
}
