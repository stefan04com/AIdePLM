import { type FormEvent, useState } from 'react'
import type { Comment, CommentRole, CommentStatus } from '../../api/types'
import { ROLE_LABEL, ROLES } from '../../lib/labels'
import { Card } from '../ui'
import { CommentLine } from './CommentLine'

interface Props {
  comments: Comment[]
  commentStatus: CommentStatus[]
  disabled: boolean
  /** author is the optional "commenting as" name; the backend decides if it is verified. */
  onComment: (role: CommentRole, text: string, author: string | null) => void
}

export function HumanReviewers({ comments, commentStatus, disabled, onComment }: Props) {
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
        {ROLES.map((role) => (
          <Card key={role} title={ROLE_LABEL[role]}>
            {comments
              .filter((c) => c.role === role)
              .map((c) => (
                <CommentLine key={c.id} comment={c} status={statusById.get(c.id)} />
              ))}
            <CommentBox
              disabled={disabled}
              onSubmit={(text) => onComment(role, text, author.trim() || null)}
            />
          </Card>
        ))}
      </div>
    </>
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
