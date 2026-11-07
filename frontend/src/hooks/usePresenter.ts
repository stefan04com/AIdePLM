import { useEffect, useRef } from 'react'

/**
 * Presenter mode: → or PageDown (what a slide clicker sends) runs the next demo step; B starts
 * the risky trend for the brand-safety beat. Ignored while typing in a field.
 */
export function usePresenter(onNext: () => void, onRisky: () => void) {
  const handlers = useRef({ onNext, onRisky })
  useEffect(() => {
    handlers.current = { onNext, onRisky } // always call the latest handlers
  })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable="true"]')) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault()
        handlers.current.onNext()
      } else if (event.key === 'b' || event.key === 'B') {
        handlers.current.onRisky()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
