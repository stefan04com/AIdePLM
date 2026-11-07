import { useEffect } from 'react'

/** A soft light follows the cursor over cards: sets --mx/--my on the card under the pointer. */
export function useSpotlight(selector = '.card, .express, .slack') {
  useEffect(() => {
    let frame = 0
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const card = (event.target as Element | null)?.closest<HTMLElement>(selector)
        if (!card) return
        const box = card.getBoundingClientRect()
        card.style.setProperty('--mx', `${event.clientX - box.left}px`)
        card.style.setProperty('--my', `${event.clientY - box.top}px`)
      })
    }
    document.addEventListener('pointermove', onMove)
    return () => {
      document.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [selector])
}
