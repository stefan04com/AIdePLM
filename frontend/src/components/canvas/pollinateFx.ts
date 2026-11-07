// DOM effects for the hashtag bee (flight, pollen sparkles). The path maths is in lib/pollinate.ts.

import { flightPath, pollenBurst, type Point } from '../../lib/pollinate'

export const BEE = 28 // px, the bee's box
const DOTS = pollenBurst(6, 16)

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Flies `bee` through `stops` (in its offset parent's coordinates). Resolves when it lands. */
export function fly(bee: HTMLElement | null, stops: Point[], durationMs: number): Promise<void> {
  if (!bee || stops.length < 2 || reducedMotion()) return Promise.resolve()
  const path = flightPath(stops, 8)
  const keyframes = path.map((f, i) => ({
    offset: f.offset,
    opacity: i === 0 || i === path.length - 1 ? 0 : 1,
    transform: `translate(${(f.x - BEE / 2).toFixed(1)}px, ${(f.y - BEE / 2).toFixed(1)}px) rotate(${f.angle.toFixed(1)}deg)`,
  }))
  const animation = bee.animate(keyframes, { duration: durationMs, easing: 'linear' })
  return animation.finished.then(
    () => undefined,
    () => undefined,
  )
}

/**
 * A pollen sparkle on `host` after `delayMs`: six honey dots burst out, plus an optional "+1".
 * Plain DOM, removed when done, so the card does not re-render per sparkle.
 */
export function sparkle(host: HTMLElement | null, delayMs: number, text?: string) {
  if (!host || reducedMotion()) return
  const burst = document.createElement('span')
  burst.className = 'pollen-burst'
  burst.setAttribute('aria-hidden', 'true')
  burst.style.setProperty('--pollen-delay', `${Math.round(delayMs)}ms`)
  for (const dot of DOTS) {
    const el = document.createElement('i')
    el.style.setProperty('--dx', `${dot.x}px`)
    el.style.setProperty('--dy', `${dot.y}px`)
    burst.append(el)
  }
  if (text) {
    const plus = document.createElement('b')
    plus.textContent = text
    burst.append(plus)
  }
  host.append(burst)
  setTimeout(() => burst.remove(), delayMs + 1000)
}

/** Centre of `el` in the coordinates of `stage`. */
export function centreIn(stage: HTMLElement, el: Element): Point {
  const s = stage.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 }
}
