import type { FitResult, Trend } from '../api/types'
import { FitGauge } from './spot/FitGauge'
import { Card, Muted, Pill, SectionHead } from './ui'

interface Props {
  trend: Trend | null
  fit: FitResult | null
  canStart: boolean
  onStart: () => void
}

export function TrendColumn({ trend, fit, canStart, onStart }: Props) {
  return (
    <section className="column">
      <SectionHead
        id="01"
        title="Signal intelligence"
        aside={trend && <Pill>{trend.source} source</Pill>}
      />
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
