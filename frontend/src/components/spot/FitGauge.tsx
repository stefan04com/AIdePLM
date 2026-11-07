// Half-circle gauge for the brand-fit score (0-100). Plain SVG, solid colour, no chart library.

const ARC = 'M 10 62 A 52 52 0 0 1 114 62'

export function FitGauge({ score, fits }: { score: number; fits: boolean }) {
  const value = Math.min(100, Math.max(0, score))

  return (
    <svg className="gauge" viewBox="0 0 124 72" role="img" aria-label={`Brand fit ${value} of 100`}>
      <path d={ARC} pathLength={100} className="gauge-track" />
      <path
        d={ARC}
        pathLength={100}
        className={`gauge-value ${fits ? 'tone-ok' : 'tone-bad'}`}
        strokeDasharray={`${value} 100`}
      />
      <text x="62" y="58" textAnchor="middle" className="gauge-score">
        {value}
      </text>
    </svg>
  )
}
