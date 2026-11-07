import { type CSSProperties, useState } from 'react'
import type { ApplyRequest, Comment, RefereeResult, SlackDelivery } from '../../api/types'
import { emergeDelay } from '../../lib/funnel'
import { humanize } from '../../lib/format'
import { Badge, Banner, SectionHead } from '../ui'
import { ConflictCard } from './ConflictCard'
import { FunnelHive } from './RefereeFunnel'
import { EditList } from './EditList'
import { ShipBar } from './ShipBar'
import { TaskList } from './TaskList'

interface Props {
  referee: RefereeResult
  comments: Comment[]
  /** True when the run is REFEREED and no action is running. */
  canShip: boolean
  /** True once the run is SHIPPED: every compromise was applied by "Apply all & ship". */
  shipped: boolean
  /** What happened to the Slack message on ship: posted, simulated (no webhook) or failed. */
  slack: SlackDelivery | null
  onApply: (body: ApplyRequest) => void
}

const SHIPPED_TEXT: Record<SlackDelivery, string> = {
  posted: 'Shipped: the post preview is updated and the message is posted in Slack.',
  simulated: 'Shipped: the post preview is updated and the Slack message is ready (simulated).',
  failed: "Shipped: the post preview is updated, but Slack didn't accept the message.",
}

export function RefereePanel({ referee, comments, canShip, shipped, slack, onApply }: Props) {
  const needsHuman = referee.status === 'needs_human'
  // On arrival, a hive at the top of the panel releases the conflict cards one by one, then fades.
  const [hive, setHive] = useState(true)

  return (
    <div className="referee-panel referee-emerging">
      {hive && (
        <div className="referee-core" onAnimationEnd={(e) => e.target === e.currentTarget && setHive(false)}>
          <FunnelHive resolved />
        </div>
      )}
      <SectionHead
        id="05"
        title="Referee"
        aside={<Badge tone={needsHuman ? 'warn' : 'ok'}>{humanize(referee.status)}</Badge>}
      />
      {needsHuman && (
        <Banner tone="warn">
          The Referee couldn't settle everything. Review the conflicts below before shipping.
        </Banner>
      )}

      {referee.conflicts.map((conflict, index) => (
        <div
          key={conflict.id}
          className="referee-emerge"
          style={{ '--emerge-delay': `${emergeDelay(index)}ms` } as CSSProperties}
        >
          <ConflictCard conflict={conflict} shipped={shipped} index={index} />
        </div>
      ))}

      <EditList edits={referee.edits} comments={comments} />
      <TaskList tasks={referee.tasks} />

      {shipped ? (
        <Banner tone={slack === 'failed' ? 'warn' : 'ok'}>{SHIPPED_TEXT[slack ?? 'simulated']}</Banner>
      ) : (
        <ShipBar
          totalConflicts={referee.conflicts.length}
          canShip={canShip}
          onShip={(acceptAllEdits) => {
            onApply({
              conflict_ids: referee.conflicts.map((c) => c.id),
              accept_all_edits: acceptAllEdits,
            })
          }}
        />
      )}
    </div>
  )
}
