import type { ApplyRequest, CommentRole, Persona, Run } from '../api/types'
import { canApply, isFinished, isReviewable } from '../lib/runStatus'
import { RefereePanel } from './referee/RefereePanel'
import { HumanReviewers } from './review/HumanReviewers'
import { PersonaCards } from './review/PersonaCards'
import { ReviewActions, type ReviewHandlers } from './review/ReviewActions'
import { Pill, SectionHead } from './ui'

interface Props extends ReviewHandlers {
  run: Run | null
  personas: Persona[]
  /** True while a request is in flight or the backend is running a step. */
  busy: boolean
  onComment: (role: CommentRole, text: string, author: string | null) => void
  onApply: (body: ApplyRequest) => void
}

export function ReviewColumn({ run, personas, busy, onComment, onApply, ...handlers }: Props) {
  return (
    <section className="column">
      <SectionHead id="04" title="Stakeholders and personas" aside={<StreamStatus run={run} />} />
      <ReviewActions run={run} busy={busy} {...handlers} />

      <h3>Humans</h3>
      <HumanReviewers
        comments={run?.comments ?? []}
        commentStatus={run?.referee?.comment_status ?? []}
        startedAt={run?.started_at ?? null}
        timersLive={run !== null && !isFinished(run)}
        disabled={busy || !isReviewable(run)}
        onComment={onComment}
      />

      <h3>Synthetic audience</h3>
      <PersonaCards personas={personas} reactions={run?.reactions ?? []} />

      {run?.referee && (
        <RefereePanel
          referee={run.referee}
          comments={run.comments}
          canShip={!busy && canApply(run)}
          shipped={run.status === 'SHIPPED'}
          onApply={onApply}
        />
      )}
    </section>
  )
}

/** "2 conflicts" once the Referee ran, otherwise the run status. */
function StreamStatus({ run }: { run: Run | null }) {
  if (!run) return null
  const conflicts = run.referee?.conflicts.length
  if (conflicts === undefined) return <Pill>{run.status.toLowerCase().replace('_', ' ')}</Pill>
  return <Pill tone={conflicts > 0 ? 'warn' : 'ok'}>{conflicts} conflicts</Pill>
}
