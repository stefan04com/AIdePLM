import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react'
import type { FitResult, Trend } from '../api/types'
import { TrendRadar } from './radar/TrendRadar'
import { useRadarScan } from './radar/useRadarScan'
import { FitGauge } from './spot/FitGauge'
import { Card, Muted, Pill, SectionHead } from './ui'

interface Props {
  trend: Trend | null
  fit: FitResult | null
  canStart: boolean
  onStart: () => void
  onTryRisky?: () => void
}

export function TrendColumn({ trend, fit, canStart, onStart, onTryRisky }: Props) {
  const lockRef = useRef<SVGGElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [origin, setOrigin] = useState({ x: 0, y: 0 })
  // Where the locked blip sits relative to the card: the card grows out of that point.
  const measure = useCallback(() => {
    const blip = lockRef.current?.getBoundingClientRect()
    const card = cardRef.current?.getBoundingClientRect()
    if (!blip || !card) return
    setOrigin({
      x: blip.left + blip.width / 2 - card.left,
      y: blip.top + blip.height / 2 - card.top,
    })
  }, [])
  const { phase, scanId, scan, finish } = useRadarScan(measure)

  // Scan once when the first trend card appears; the Scan button repeats it.
  const scanned = useRef(false)
  const hasTrend = trend !== null
  useEffect(() => {
    if (!hasTrend || scanned.current) return
    scanned.current = true
    scan()
  }, [hasTrend, scan])

  // Starting never waits for the radar: it just jumps to the end.
  const start = () => {
    finish()
    onStart()
  }
  const tryRisky = () => {
    finish()
    onTryRisky?.()
  }

  const zoomStyle = { '--radar-ox': `${origin.x}px`, '--radar-oy': `${origin.y}px` } as CSSProperties
  return (
    <section className="column">
      <SectionHead
        id="01"
        title="Signal intelligence"
        aside={trend && <Pill>{trend.source} source</Pill>}
      />
      <TrendRadar trend={trend} phase={phase} scanId={scanId} onScan={scan} lockRef={lockRef} />
      {trend ? (
        <div ref={cardRef} className={`radar-target is-${phase}`} style={zoomStyle}>
          <TrendCard trend={trend} />
        </div>
      ) : (
        <Muted>Loading trend…</Muted>
      )}
      {fit && <FitCard fit={fit} />}
      <button className="primary" disabled={!trend || !canStart} onClick={start}>
        Start run
      </button>
      {onTryRisky && (
        <button className="risky" disabled={!canStart} onClick={tryRisky} title="Brand-safety demo: a trend the fit check should reject (key B)">
          Try a risky trend
        </button>
      )}
    </section>
  )
}

function TrendCard({ trend }: { trend: Trend }) {
  return (
    <Card className="trend">
      <h3>{trend.title}</h3>
      <p>{trend.summary}</p>
      {trend.url && (
        <a href={trend.url} target="_blank" rel="noreferrer">
          Source
        </a>
      )}
    </Card>
  )
}

function FitCard({ fit }: { fit: FitResult }) {
  return (
    <Card className={`fit ${fit.fits ? 'fit-yes' : 'fit-no'}`}>
      <FitGauge score={fit.score} fits={fit.fits} />
      <p className="fit-status">
        <span className="mono">{fit.score} / 100</span>
        <strong>{fit.fits ? 'Fits the brand' : 'Not a fit'}</strong>
      </p>
      <p className="muted">{fit.reason}</p>
    </Card>
  )
}
