import type { Conflict } from '../../api/types'
import { Card } from '../ui'

interface Props {
  conflict: Conflict
  accepted: boolean
  disabled: boolean
  onToggle: () => void
}

export function ConflictCard({ conflict, accepted, disabled, onToggle }: Props) {
  const title = conflict.between.map((party) => party.label).join(' vs ')

  return (
    <Card title={title} accent={accepted ? 'ok' : 'warn'} className="conflict">
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
      <button
        className={accepted ? 'accepted' : ''}
        aria-pressed={accepted}
        disabled={disabled}
        onClick={onToggle}
      >
        {accepted ? 'Compromise accepted' : 'Accept compromise'}
      </button>
    </Card>
  )
}
