import type { Conflict } from '../../api/types'
import { Badge, Card } from '../ui'

interface Props {
  conflict: Conflict
  /** True once the run shipped: the compromise is in the published caption. */
  applied: boolean
}

/** One conflict and its compromise. No per-conflict choice: "Apply all & ship" applies every compromise. */
export function ConflictCard({ conflict, applied }: Props) {
  const parties = conflict.between.map((party) => party.label).join(' vs ')
  const title = (
    <>
      {parties}
      {applied && <Badge tone="ok">applied</Badge>}
    </>
  )

  return (
    <Card title={title} accent={applied ? 'ok' : 'warn'} className="conflict">
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
    </Card>
  )
}
