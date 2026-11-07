import type { CSSProperties } from 'react'
import type { Conflict } from '../../api/types'
import { Card } from '../ui'

interface Props {
  conflict: Conflict
  /** True once the run is shipped: the compromise is in the post. */
  shipped: boolean
  /** Position in the list: each card's clash plays a little after the one above. */
  index: number
}

/**
 * One conflict. When it first appears, the two sides fly in from opposite edges and collide with a
 * spark, then the compromise lights up: what the Referee did, played out.
 */
export function ConflictCard({ conflict, shipped, index }: Props) {
  const title = conflict.between.map((party) => party.label).join(' vs ')
  const [left, right] = conflict.between

  return (
    <div className="conflict-wrap" style={{ '--i': index } as CSSProperties}>
      {left && right && (
        <div className="clash" aria-hidden>
          <span className="clash-side clash-left">{left.label}</span>
          <span className="clash-spark" />
          <span className="clash-side clash-right">{right.label}</span>
        </div>
      )}
      <Card title={title} accent={shipped ? 'ok' : 'warn'} className="conflict">
      <p>{conflict.summary}</p>
      <ul>
        {conflict.between.map((party) => (
          <li key={party.id}>
            <strong>{party.label}:</strong> {conflict.positions[party.id]}
            {party.kind === 'persona' && <span className="muted"> (synthetic customer)</span>}
          </li>
        ))}
      </ul>
      <p className="compromise">
        <strong>Compromise:</strong> {conflict.compromise}
      </p>
      <p className="muted">
        {shipped ? 'Applied in the shipped post.' : 'Applied when you ship (the Referee’s compromise).'}
      </p>
      </Card>
    </div>
  )
}
