import type { Comment, CommentStatus } from '../../api/types'
import { formatElapsed, humanize } from '../../lib/format'
import { authorLabel } from '../../lib/labels'
import { COMMENT_STATUS_TONE } from '../../lib/tones'
import { Badge } from '../ui'

const WEIGHT_HELP = 'Weight = expertise × recency (docs/comment-weighting.md)'

interface Props {
  comment: Comment
  status?: CommentStatus
}

/** One reviewer comment with who wrote it, how much it counts and what the Referee did with it. */
export function CommentLine({ comment, status }: Props) {
  return (
    <div className="comment">
      <p>{comment.text}</p>
      <div className="comment-meta">
        <span className="muted">
          {authorLabel(comment)} · {formatElapsed(comment.created_at)} ago
        </span>
        {comment.industry_verified && <Badge tone="ok">verified industry</Badge>}
        <Badge tone={comment.weight > 1 ? 'ok' : 'neutral'} title={WEIGHT_HELP}>
          ×{comment.weight.toFixed(2)}
        </Badge>
        {status && (
          <Badge tone={COMMENT_STATUS_TONE[status.status]} title={status.why}>
            {humanize(status.status)}
          </Badge>
        )}
      </div>
    </div>
  )
}
