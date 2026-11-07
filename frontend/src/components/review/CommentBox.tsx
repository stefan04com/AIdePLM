import { type FormEvent, type KeyboardEvent, useState } from 'react'

interface Props {
  disabled: boolean
  /** Starting text, e.g. the pre-filled Product comment from the demo script. */
  initialText?: string
  onSubmit: (text: string) => void
}

/** Multi-line comment box: Enter sends, Shift+Enter adds a new line. */
export function CommentBox({ disabled, initialText = '', onSubmit }: Props) {
  const [text, setText] = useState(initialText)

  const send = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setText('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <form
      className="comment-box"
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        send()
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Add a comment…"
        rows={text ? 3 : 1}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || !text.trim()}>
        Send
      </button>
    </form>
  )
}
