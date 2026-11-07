import type { ApplyRequest, Comment, RefereeResult } from '../../api/types'
import { useAcceptedConflicts } from '../../hooks/useAcceptedConflicts'
import { humanize } from '../../lib/format'
import { Badge, Banner } from '../ui'
import { ConflictCard } from './ConflictCard'
import { EditList } from './EditList'
import { ShipBar } from './ShipBar'
import { TaskList } from './TaskList'

interface Props {
  referee: RefereeResult
  comments: Comment[]
  /** True when the run is REFEREED and no action is running. */
  canShip: boolean
  onApply: (body: ApplyRequest) => void
}

export function RefereePanel({ referee, comments, canShip, onApply }: Props) {
  const { accepted, toggle, acceptAll, acceptedIds } = useAcceptedConflicts(referee.conflicts)
  const needsHuman = referee.status === 'needs_human'

  return (
    <>
      <h3>
        Referee
        <Badge tone={needsHuman ? 'warn' : 'ok'}>{humanize(referee.status)}</Badge>
      </h3>
      {needsHuman && (
        <Banner tone="warn">
          The Referee couldn't settle everything. Review the conflicts below before shipping.
        </Banner>
      )}

      {referee.conflicts.map((conflict) => (
        <ConflictCard
          key={conflict.id}
          conflict={conflict}
          accepted={accepted.has(conflict.id)}
          disabled={!canShip}
          onToggle={() => toggle(conflict.id)}
        />
      ))}

      <EditList edits={referee.edits} comments={comments} />
      <TaskList tasks={referee.tasks} />

      <ShipBar
        acceptedCount={acceptedIds.length}
        totalConflicts={referee.conflicts.length}
        canShip={canShip}
        onShip={(acceptAllEdits) => {
          acceptAll() // one click accepts every compromise (docs/demo-script.md)
          onApply({
            conflict_ids: referee.conflicts.map((c) => c.id),
            accept_all_edits: acceptAllEdits,
          })
        }}
      />
    </>
  )
}
