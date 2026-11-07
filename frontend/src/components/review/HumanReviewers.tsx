import { useState } from 'react'
import type { Comment, CommentRole, CommentStatus } from '../../api/types'
import { ROLE_LABEL, ROLES } from '../../lib/labels'
import { prefilledComment } from '../../mocks/scriptedComments'
import { Card } from '../ui'
import { CommentBox } from './CommentBox'
import { CommentLine } from './CommentLine'
import { ReviewerTimer } from './ReviewerTimer'

interface Props {
  comments: Comment[]
  commentStatus: CommentStatus[]
  /** When the run started (reviewer timers count from here); null before the first run. */
  startedAt: string | null
  /** Reviewer timers tick until the run is shipped or rejected. */
  timersLive: boolean
  disabled: boolean
  /** author is the optional "commenting as" name; the backend decides if it is verified. */
  onComment: (role: CommentRole, text: string, author: string | null) => void
}

export function HumanReviewers(props: Props) {
  const { comments, commentStatus, startedAt, timersLive, disabled, onComment } = props
  const [author, setAuthor] = useState('')
  const statusById = new Map(commentStatus.map((s) => [s.comment_id, s]))

  return (
    <>
      <label className="commenting-as">
        Commenting as
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Your name (optional, verified industry experts count 3×)"
          disabled={disabled}
        />
      </label>
      <div className="grid">
        {ROLES.map((role) => {
          const roleComments = comments.filter((c) => c.role === role)
          const title = (
            <>
              {ROLE_LABEL[role]}
              {startedAt && (
                <ReviewerTimer
                  startedAt={startedAt}
                  firstComment={roleComments[0]}
                  live={timersLive}
                />
              )}
            </>
          )
          return (
            <Card key={`${role}-${startedAt}`} title={title}>
              {roleComments.map((c) => (
                <CommentLine key={c.id} comment={c} status={statusById.get(c.id)} />
              ))}
              <CommentBox
                disabled={disabled}
                initialText={roleComments.length === 0 ? prefilledComment(role) : ''}
                onSubmit={(text) => onComment(role, text, author.trim() || null)}
              />
            </Card>
          )
        })}
      </div>
    </>
  )
}
