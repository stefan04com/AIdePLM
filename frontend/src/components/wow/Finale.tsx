import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Run } from '../../api/types'
import { MEASURED_IN_LIVE_EVAL } from '../../lib/cost'
import { countUp, REAL_REVIEWS, REVIEW_DAYS } from '../../lib/wow'
import { BeeSvg } from '../adobee/BeeSvg'

const COUNT_MS = 1600

/** The closing screen (key E): the run's numbers count up next to a happy Adobee. Esc or a click closes it. */
export function Finale({ run, onClose }: { run: Run | null; onClose: () => void }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / COUNT_MS, 1)
      setProgress(p)
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const shipped = run?.status === 'SHIPPED' && run.shipped_at ? run : null
  const seconds = shipped ? Math.round((Date.parse(shipped.shipped_at!) - Date.parse(shipped.started_at)) / 1000) : null
  const conflicts = shipped?.referee?.conflicts.length ?? null
  const count = (target: number) => Math.round(countUp(target, progress))

  return createPortal(
    <div className="finale" role="dialog" aria-label="AdoBee in numbers" onClick={onClose}>
      <div className="finale-bee" aria-hidden>
        <BeeSvg mood="happy" look={{ x: 0, y: 2 }} />
      </div>
      <h2 className="finale-title">AdoBee</h2>
      <p className="finale-tagline">From trend to approved post, with customers at the table.</p>
      <div className="finale-stats">
        {seconds !== null && (
          <div className="finale-stat">
            <strong>{count(seconds)}s</strong>
            <span>trend → approved post, vs {REVIEW_DAYS} days</span>
          </div>
        )}
        {conflicts !== null && (
          <div className="finale-stat">
            <strong>{count(conflicts)}</strong>
            <span>conflicts found and resolved</span>
          </div>
        )}
        <div className="finale-stat">
          <strong>{count(REAL_REVIEWS)}</strong>
          <span>real reviews behind the personas</span>
        </div>
        <div className="finale-stat">
          <strong>${countUp(MEASURED_IN_LIVE_EVAL.perPostUsd, progress).toFixed(4)}</strong>
          <span>per post, measured live</span>
        </div>
      </div>
      <p className="finale-hint">Thank you · Esc to close</p>
    </div>,
    document.body,
  )
}
