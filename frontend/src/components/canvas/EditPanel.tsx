import { useState } from 'react'
import type { Draft } from '../../api/types'
import {
  checkRegenerate,
  MAX_CAPTION,
  MAX_INSTRUCTION,
  pushHistory,
  SUGGESTED_INSTRUCTIONS,
} from '../../lib/regenerate'
import { Card, Muted } from '../ui'

interface Props {
  draft: Draft
  /** False once shipped, or while the backend runs a step. */
  enabled: boolean
  onRegenerate: (caption: string, instruction: string) => Promise<void>
}

/** Edit the caption and ask the AI to rewrite it. Earlier versions stay in a list to go back to. */
export function EditPanel({ draft, enabled, onRegenerate }: Props) {
  const [text, setText] = useState(draft.caption)
  const [instruction, setInstruction] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [shownCaption, setShownCaption] = useState(draft.caption)

  // The backend wrote a new caption (a regeneration): show it and keep the old one in the history.
  if (draft.caption !== shownCaption) {
    setHistory((prev) => pushHistory(prev, shownCaption, draft.caption))
    setShownCaption(draft.caption)
    setText(draft.caption)
    setInstruction('')
  }

  const check = checkRegenerate(text, instruction)
  const rewrites = draft.regenerations ?? 0

  return (
    <Card title="Edit and regenerate" className="edit-panel">
      <label className="edit-label" htmlFor="edit-caption">
        Caption
      </label>
      <textarea
        id="edit-caption"
        value={text}
        rows={4}
        maxLength={MAX_CAPTION}
        disabled={!enabled}
        onChange={(e) => setText(e.target.value)}
      />

      <label className="edit-label" htmlFor="edit-instruction">
        What should change?
      </label>
      <input
        id="edit-instruction"
        value={instruction}
        maxLength={MAX_INSTRUCTION}
        placeholder="e.g. shorter, warmer, no call to action"
        disabled={!enabled}
        onChange={(e) => setInstruction(e.target.value)}
      />
      <div className="edit-chips">
        {SUGGESTED_INSTRUCTIONS.map((suggestion) => (
          <button key={suggestion} disabled={!enabled} onClick={() => setInstruction(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>

      <div className="edit-actions">
        <button
          className="primary"
          disabled={!enabled || !check.ok}
          onClick={() => onRegenerate(text, instruction)}
        >
          Regenerate
        </button>
        <button disabled={!enabled || text === draft.caption} onClick={() => setText(draft.caption)}>
          Reset to current
        </button>
        <span className="muted">{enabled && !check.ok ? check.reason : ''}</span>
      </div>
      <Muted>
        Regenerating rewrites the caption and restarts the review (comments are kept).
        {rewrites > 0 && ` Rewritten ${rewrites} time${rewrites === 1 ? '' : 's'}.`}
      </Muted>

      {history.length > 0 && (
        <details className="edit-history">
          <summary>Earlier versions ({history.length})</summary>
          <ul>
            {history.map((caption) => (
              <li key={caption}>
                <p>{caption}</p>
                <button disabled={!enabled} onClick={() => setText(caption)}>
                  Use this text
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  )
}
