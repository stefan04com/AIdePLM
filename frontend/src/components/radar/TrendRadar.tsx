import { type RefObject, useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import type { LiveTrends, Trend } from '../../api/types'
import { placeBlips, shortTitle, snapshotLabel } from '../../lib/radar'
import type { RadarPhase } from './useRadarScan'
import '../../styles/radar.css'

const SCOPE = 92 // scope radius in the -100..100 viewBox
const RINGS = [0.33, 0.66, 1]
// Sweep beam: a 40° wedge trailing the leading edge at 12 o'clock.
const WEDGE = `M0 0 L${(-Math.sin((40 * Math.PI) / 180) * SCOPE).toFixed(2)} ${(
  -Math.cos((40 * Math.PI) / 180) * SCOPE
).toFixed(2)} A${SCOPE} ${SCOPE} 0 0 1 0 ${-SCOPE} Z`

interface Props {
  trend: Trend | null
  phase: RadarPhase
  scanId: number
  onScan: () => void
  /** The current trend's blip, measured so the trend card can zoom out of it. */
  lockRef: RefObject<SVGGElement | null>
}

/** Radar of the real collected trends: a sweep finds them, the current one locks on. */
export function TrendRadar({ trend, phase, scanId, onScan, lockRef }: Props) {
  const [live, setLive] = useState<LiveTrends | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api
      .getLiveTrends()
      .then((data) => alive && setLive(data))
      .catch(() => undefined) // the radar then shows only the current trend
    return () => {
      alive = false
    }
  }, [])

  const trends = useMemo(() => {
    const list = live?.trends ?? []
    return trend && !list.some((t) => t.id === trend.id) ? [...list, trend] : list
  }, [live, trend])
  const byId = useMemo(() => new Map(trends.map((t) => [t.id, t])), [trends])
  const blips = useMemo(() => placeBlips(trends.map((t) => t.id)), [trends])
  const hoveredBlip = blips.find((b) => b.id === hovered)
  const scanning = phase !== 'idle'
  const count = live?.trends.length ?? 0

  return (
    <div className={`radar ${scanning ? 'is-scanning' : ''} is-${phase}`}>
      <div className="radar-scope">
        <svg viewBox="-100 -100 200 200" role="group" aria-label="Trend radar">
          {RINGS.map((r) => (
            <circle key={r} className={`radar-ring ${r === 1 ? 'is-edge' : ''}`} r={r * SCOPE} />
          ))}
          <path className="radar-cross" d={`M${-SCOPE} 0H${SCOPE}M0 ${-SCOPE}V${SCOPE}`} />
          <g className="radar-sweep" key={`sweep-${scanId}`} aria-hidden>
            <path d={WEDGE} />
            <line x1="0" y1="0" x2="0" y2={-SCOPE} />
          </g>
          <circle className="radar-core" r="3.5" />
          <g key={`blips-${scanId}`}>
            {blips.map((blip) => {
              const t = byId.get(blip.id)
              if (!t) return null
              const current = blip.id === trend?.id
              const dot = (
                <g
                  ref={current ? lockRef : undefined}
                  className={`radar-blip ${current ? 'is-current' : ''}`}
                  transform={`translate(${(blip.x * SCOPE).toFixed(2)} ${(blip.y * SCOPE).toFixed(2)})`}
                  onMouseEnter={() => setHovered(blip.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <g className="radar-blip-dot" style={{ animationDelay: `${blip.delayMs}ms` }}>
                    {current && <circle className="radar-lock" r="11" />}
                    <circle className="radar-hit" r="11" />
                    <circle className="radar-dot" r={current ? 5 : 4} />
                  </g>
                </g>
              )
              const label = `${shortTitle(t.title)}${current ? ' (current trend)' : ''}`
              return t.url ? (
                <a
                  key={blip.id}
                  href={t.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${label}, open source`}
                  onFocus={() => setHovered(blip.id)}
                  onBlur={() => setHovered(null)}
                >
                  {dot}
                </a>
              ) : (
                <g key={blip.id} aria-label={label}>
                  {dot}
                </g>
              )
            })}
          </g>
        </svg>
        {hoveredBlip && byId.get(hoveredBlip.id) && (
          <span
            className={`radar-tip ${hoveredBlip.x > 0.2 ? 'is-left' : ''}`}
            style={{ left: `${50 + hoveredBlip.x * 46}%`, top: `${50 + hoveredBlip.y * 46}%` }}
            role="tooltip"
          >
            {shortTitle(byId.get(hoveredBlip.id)!.title)}
          </span>
        )}
      </div>
      <div className="radar-side">
        <strong className="radar-title">Trend radar</strong>
        <span className="radar-snapshot">
          {live ? snapshotLabel(live.source, live.collected_at) : 'saved snapshot'}
        </span>
        <span className="radar-count">
          {count > 0 ? `${count} real trends · hover a blip, click for its source` : 'current trend only'}
        </span>
        <span className="radar-status" aria-live="polite">
          {phase === 'sweep' ? 'Scanning…' : trend ? 'Locked on the current trend' : ''}
        </span>
        <button type="button" className="radar-scan" onClick={onScan} disabled={!trend}>
          Scan
        </button>
      </div>
    </div>
  )
}
