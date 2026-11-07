import type { FitResult, Trend } from '../api/types'
import { Badge, Card, Muted } from './ui'

interface Props {
  trend: Trend | null
  fit: FitResult | null
  canStart: boolean
  onStart: () => void
}

export function TrendColumn({ trend, fit, canStart, onStart }: Props) {
  return (
    <section className="column">
      <h2>Spot</h2>
      {trend ? <TrendCard trend={trend} /> : <Muted>Loading trend…</Muted>}
      {fit && <FitCard fit={fit} />}
      <button className="primary" disabled={!trend || !canStart} onClick={onStart}>
        Start run
      </button>
    </section>
  )
}

function TrendCard({ trend }: { trend: Trend }) {
  return (
    <Card>
      <Badge>{trend.source}</Badge>
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
    <Card accent={fit.fits ? 'ok' : 'bad'} className="fit">
      <div className="fit-score">
        {fit.score}
        <small>/100</small>
      </div>
      <div>
        <strong>{fit.fits ? 'Fits the brand' : 'Not a fit'}</strong>
        <p>{fit.reason}</p>
      </div>
    </Card>
  )
}
