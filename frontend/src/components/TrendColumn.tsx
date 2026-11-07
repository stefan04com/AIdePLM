import type { FitResult, Trend } from '../api/types'

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
      {!trend ? (
        <p className="muted">Loading trend…</p>
      ) : (
        <article className="card">
          <span className="badge">{trend.source}</span>
          <h3>{trend.title}</h3>
          <p>{trend.summary}</p>
          {trend.url && (
            <a href={trend.url} target="_blank" rel="noreferrer">
              Source
            </a>
          )}
        </article>
      )}

      {fit && (
        <article className={`card fit ${fit.fits ? 'fit-yes' : 'fit-no'}`}>
          <div className="fit-score">
            {fit.score}
            <small>/100</small>
          </div>
          <div>
            <strong>{fit.fits ? 'Fits the brand' : 'Not a fit'}</strong>
            <p>{fit.reason}</p>
          </div>
        </article>
      )}

      <button className="primary" disabled={!trend || !canStart} onClick={onStart}>
        Start run
      </button>
    </section>
  )
}
