import type { CommentRole, Persona, Run } from '../api/types'
import { isReviewable } from '../lib/runStatus'
import { ConflictCards } from './review/ConflictCards'
import { HumanReviewers } from './review/HumanReviewers'
import { PersonaCards } from './review/PersonaCards'
import { ReviewActions, type ReviewHandlers } from './review/ReviewActions'

interface Props extends ReviewHandlers {
  run: Run | null
  personas: Persona[]
  busy: boolean
  onComment: (role: CommentRole, text: string) => void
}

export function ReviewColumn({ run, personas, busy, onComment, ...handlers }: Props) {
  const canReview = isReviewable(run)

  return (
    <section className="column">
      <h2>Review</h2>
      <ReviewActions status={run?.status} canReview={canReview} busy={busy} {...handlers} />

      <h3>Humans</h3>
      <HumanReviewers
        comments={run?.comments ?? []}
        commentStatus={run?.referee?.comment_status ?? []}
        disabled={!canReview || busy}
        onComment={onComment}
      />

      <h3>Synthetic audience</h3>
      <PersonaCards personas={personas} reactions={run?.reactions ?? []} />

      {run?.referee && <ConflictCards referee={run.referee} />}
    </section>
  )
}
