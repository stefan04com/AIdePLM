import { useState } from 'react'
import type { CommentRole, CommentStatus, Persona, Run } from '../api/types'

const ROLES: { role: CommentRole; label: string }[] = [
  { role: 'brand', label: 'Brand' },
  { role: 'legal', label: 'Legal' },
  { role: 'product', label: 'Product' },
]

interface Props {
  run: Run | null
  personas: Persona[]
  busy: boolean
  onRequestReactions: () => void
  onComment: (role: CommentRole, text: string) => void
  onFillScripted: () => void
  onReferee: () => void
  onApply: () => void
}

export function ReviewColumn(props: Props) {
  const { run, personas, busy } = props
  const status = run?.status
  const canReview = status === 'DRAFTED' || status === 'IN_REVIEW' || status === 'REFEREED'
  const statusById = new Map<string, CommentStatus>(
    (run?.referee?.comment_status ?? []).map((s) => [s.comment_id, s]),
  )

  return (
    <section className="column">
      <h2>Review</h2>

      <div className="actions">
        <button disabled={!canReview || busy} onClick={props.onRequestReactions}>
          Persona reactions
        </button>
        <button disabled={!canReview || busy} onClick={props.onFillScripted}>
          Fill scripted comments
        </button>
        <button disabled={status !== 'IN_REVIEW' || busy} onClick={props.onReferee}>
          Run referee
        </button>
        <button className="primary" disabled={status !== 'REFEREED' || busy} onClick={props.onApply}>
          Apply &amp; ship
        </button>
      </div>

      <h3>Humans</h3>
      <div className="grid">
        {ROLES.map(({ role, label }) => (
          <article key={role} className="card">
            <h4>{label}</h4>
            {run?.comments
              .filter((c) => c.role === role)
              .map((c) => {
                const s = statusById.get(c.id)
                return (
                  <p key={c.id} className="comment">
                    {c.text}
                    {s && (
                      <span className={`badge status-${s.status}`} title={s.why}>
                        {s.status.replace('_', ' ')}
                      </span>
                    )}
                  </p>
                )
              })}
            <CommentBox
              disabled={!canReview || busy}
              onSubmit={(text) => props.onComment(role, text)}
            />
          </article>
        ))}
      </div>

      <h3>Synthetic audience</h3>
      <div className="grid">
        {personas.map((p) => {
          const reaction = run?.reactions.find((r) => r.persona_id === p.id)
          return (
            <article key={p.id} className="card">
              <h4>{p.name}</h4>
              <p className="muted">{p.segment}</p>
              {p.sample_quotes[0] && <blockquote>“{p.sample_quotes[0]}”</blockquote>}
              {reaction && (
                <p className="comment">
                  {reaction.reaction}
                  <span className="badge">
                    {reaction.sentiment > 0 ? '+' : ''}
                    {reaction.sentiment.toFixed(1)} · {reaction.would_engage ? 'engages' : 'scrolls past'}
                  </span>
                </p>
              )}
            </article>
          )
        })}
      </div>

      {run?.referee && (
        <>
          <h3>Referee · {run.referee.status.replace(/_/g, ' ')}</h3>
          {run.referee.conflicts.map((conflict) => (
            <article key={conflict.id} className="card conflict">
              <h4>{conflict.between.map((p) => p.label).join(' vs ')}</h4>
              <p>{conflict.summary}</p>
              <ul>
                {conflict.between.map((p) => (
                  <li key={p.id}>
                    <strong>{p.label}:</strong> {conflict.positions[p.id]}
                  </li>
                ))}
              </ul>
              <p className="compromise">
                <strong>Compromise:</strong> {conflict.compromise}
              </p>
            </article>
          ))}
        </>
      )}
    </section>
  )
}

function CommentBox({ disabled, onSubmit }: { disabled: boolean; onSubmit: (text: string) => void }) {
  const [text, setText] = useState('')
  return (
    <form
      className="comment-box"
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        onSubmit(text.trim())
        setText('')
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment…"
        disabled={disabled}
      />
    </form>
  )
}
