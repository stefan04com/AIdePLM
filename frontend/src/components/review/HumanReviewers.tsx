import { type FormEvent, useState } from 'react'
import type { Comment, CommentRole, CommentStatus } from '../../api/types'
import { humanize } from '../../lib/format'
import { ROLE_LABEL, ROLES } from '../../lib/labels'
import { COMMENT_STATUS_TONE } from '../../lib/tones'
import { Badge, Card } from '../ui'

interface Props {
  comments: Comment[]
  commentStatus: CommentStatus[]
  disabled: boolean
  onComment: (role: CommentRole, text: string) => void
}

export function HumanReviewers({ comments, commentStatus, disabled, onComment }: Props) {
  const statusById = new Map(commentStatus.map((s) => [s.comment_id, s]))

  return (
    <div className="grid">
      {ROLES.map((role) => (
        <Card key={role} title={ROLE_LABEL[role]}>
          {comments
            .filter((c) => c.role === role)
            .map((c) => (
              <CommentLine key={c.id} comment={c} status={statusById.get(c.id)} />
            ))}
          <CommentBox disabled={disabled} onSubmit={(text) => onComment(role, text)} />
        </Card>
      ))}
    </div>
  )
}

function CommentLine({ comment, status }: { comment: Comment; status?: CommentStatus }) {
  return (
    <p className="comment">
      {comment.text}
      {status && (
        <Badge tone={COMMENT_STATUS_TONE[status.status]} title={status.why}>
          {humanize(status.status)}
        </Badge>
      )}
    </p>
  )
}

interface CommentBoxProps {
  disabled: boolean
  onSubmit: (text: string) => void
}

function CommentBox({ disabled, onSubmit }: CommentBoxProps) {
  const [text, setText] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setText('')
  }

  return (
    <form className="comment-box" onSubmit={submit}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment…"
        disabled={disabled}
      />
    </form>
  )
}
