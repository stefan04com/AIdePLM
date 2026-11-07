import type { Comment, Edit } from '../../api/types'
import { type DiffPart, diffWords } from '../../lib/diff'
import { commentAuthor, EDIT_TARGET_LABEL } from '../../lib/labels'
import { Badge, Card } from '../ui'

interface Props {
  edits: Edit[]
  comments: Comment[]
}

export function EditList({ edits, comments }: Props) {
  if (edits.length === 0) return null

  return (
    <Card title="Concrete edits">
      {edits.map((edit, index) => (
        <EditRow key={index} edit={edit} author={commentAuthor(comments, edit.source_comment_id)} />
      ))}
    </Card>
  )
}

function EditRow({ edit, author }: { edit: Edit; author: string | null }) {
  return (
    <div className="edit-row">
      <div>
        <Badge>{EDIT_TARGET_LABEL[edit.target]}</Badge>
        {author && <span className="muted"> from {author}</span>}
      </div>
      <p className="diff">
        {diffWords(edit.before, edit.after).map((part, index) => (
          <DiffText key={index} part={part} />
        ))}
      </p>
    </div>
  )
}

function DiffText({ part }: { part: DiffPart }) {
  if (part.kind === 'removed') return <del>{part.text}</del>
  if (part.kind === 'added') return <ins>{part.text}</ins>
  return <>{part.text}</>
}
