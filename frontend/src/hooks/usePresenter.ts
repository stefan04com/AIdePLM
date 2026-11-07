import { useEffect, useRef } from 'react'

/** What each presenter key does. */
export interface PresenterKeys {
  next: () => void // → or PageDown (what a slide clicker sends): the next demo step
  risky: () => void // B: the risky trend, for the brand-safety beat
  stage: () => void // S: stage mode on / off
  finale: () => void // E: the closing screen
}

/**
 * Presenter mode: one key per demo action, so the stage never depends on finding a button.
 * Ignored while typing in a field or moving between the page tabs.
 */
export function usePresenter(keys: PresenterKeys) {
  const handlers = useRef(keys)
  useEffect(() => {
    handlers.current = keys // always call the latest handlers
  })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      // typing in a field, or arrowing between the Post / Rules tabs
      if (target?.closest('input, textarea, [contenteditable="true"], [role="tablist"]')) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const key = event.key.toLowerCase()
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault()
        handlers.current.next()
      } else if (key === 'b') handlers.current.risky()
      else if (key === 's') handlers.current.stage()
      else if (key === 'e') handlers.current.finale()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
