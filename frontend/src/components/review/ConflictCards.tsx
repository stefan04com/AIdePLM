import type { Conflict, RefereeResult } from '../../api/types'
import { humanize } from '../../lib/format'
import { Card } from '../ui'

export function ConflictCards({ referee }: { referee: RefereeResult }) {
  return (
    <>
      <h3>Referee · {humanize(referee.status)}</h3>
      {referee.conflicts.map((conflict) => (
        <ConflictCard key={conflict.id} conflict={conflict} />
      ))}
    </>
  )
}

function ConflictCard({ conflict }: { conflict: Conflict }) {
  const title = conflict.between.map((party) => party.label).join(' vs ')

  return (
    <Card title={title} accent="warn">
      <p>{conflict.summary}</p>
      <ul>
        {conflict.between.map((party) => (
          <li key={party.id}>
            <strong>{party.label}:</strong> {conflict.positions[party.id]}
          </li>
        ))}
      </ul>
      <p className="compromise">
        <strong>Compromise:</strong> {conflict.compromise}
      </p>
    </Card>
  )
}
