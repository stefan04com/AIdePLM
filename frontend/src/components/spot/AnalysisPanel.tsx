import type { Run } from '../../api/types'
import { useNow } from '../../hooks/useNow'
import type { Usage } from '../../hooks/useUsage'
import { postCost } from '../../lib/cost'
import { computeFactors, type Factor } from '../../lib/factors'
import { isFinished } from '../../lib/runStatus'
import { toneClass } from '../../lib/tones'
import { SectionHead } from '../ui'

/** Every factor behind the decision to ship, from the run's real data (lib/factors.ts). */
export function AnalysisPanel({ run, usage }: { run: Run | null; usage: Usage }) {
  const now = useNow(run !== null && !isFinished(run))
  const factors = computeFactors(run, postCost(usage.all?.calls), now)

  return (
    <section className="column">
      <SectionHead id="02" title="Analysis" />
      <div className="card factors">
        {factors.map((factor) => (
          <FactorRow key={factor.label} factor={factor} />
        ))}
      </div>
    </section>
  )
}

function FactorRow({ factor }: { factor: Factor }) {
  return (
    <div className={`factor ${toneClass(factor.tone)}`}>
      <div className="factor-head">
        <span className="factor-label">{factor.label}</span>
        <span className="factor-value">{factor.value}</span>
      </div>
      {factor.level !== null && (
        <div className="factor-bar" aria-hidden>
          <span style={{ width: `${Math.round(factor.level * 100)}%` }} />
        </div>
      )}
      <div className="factor-detail">{factor.detail}</div>
    </div>
  )
}
