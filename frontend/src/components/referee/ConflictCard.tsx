import type { Conflict } from '../../api/types'
import { Card } from '../ui'

interface Props {
  conflict: Conflict
  /** True once the run is shipped: the compromise is in the post. */
  shipped: boolean
}

export function ConflictCard({ conflict, shipped }: Props) {
  const title = conflict.between.map((party) => party.label).join(' vs ')

  return (
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
  )
}
