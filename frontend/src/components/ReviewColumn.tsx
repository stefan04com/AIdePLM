import type { ApplyRequest, CommentRole, Persona, Run } from '../api/types'
import { canApply, isReviewable } from '../lib/runStatus'
import { RefereePanel } from './referee/RefereePanel'
import { HumanReviewers } from './review/HumanReviewers'
import { PersonaCards } from './review/PersonaCards'
import { ReviewActions, type ReviewHandlers } from './review/ReviewActions'

interface Props extends ReviewHandlers {
  run: Run | null
  personas: Persona[]
  /** True while a request is in flight or the backend is running a step. */
  busy: boolean
  onComment: (role: CommentRole, text: string) => void
  onApply: (body: ApplyRequest) => void
}

export function ReviewColumn({ run, personas, busy, onComment, onApply, ...handlers }: Props) {
  return (
    <section className="column">
      <h2>Review</h2>
      <ReviewActions run={run} busy={busy} {...handlers} />

      <h3>Humans</h3>
      <HumanReviewers
        comments={run?.comments ?? []}
        commentStatus={run?.referee?.comment_status ?? []}
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
          onApply={onApply}
        />
      )}
    </section>
  )
}
