import type { KeyboardEvent } from 'react'
import { stepView, type View, VIEWS } from '../../lib/view'

interface Props {
  view: View
  onChange: (view: View) => void
}

/** The two menus. A real tablist: arrow keys move between tabs, the active tab is marked. */
export function ViewTabs({ view, onChange }: Props) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = stepView(view, e.key === 'ArrowRight' ? 1 : -1)
    onChange(next)
    document.getElementById(`tab-${next}`)?.focus()
  }

  return (
    <nav className="view-tabs" role="tablist" aria-label="Pages" onKeyDown={onKeyDown}>
      {VIEWS.map(({ id, label }) => (
        <button
          key={id}
          id={`tab-${id}`}
          role="tab"
          aria-selected={view === id}
          aria-controls={`panel-${id}`}
          tabIndex={view === id ? 0 : -1}
          className={`view-tab ${view === id ? 'active' : ''}`}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
