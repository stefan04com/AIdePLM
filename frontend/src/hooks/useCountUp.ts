// A number that counts up (or down) smoothly to `target` with requestAnimationFrame.
// Jumps straight to the target under prefers-reduced-motion.

import { useEffect, useRef, useState } from 'react'
import { countUpValue } from '../lib/ticker'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useCountUp(target: number, durationMs: number): number {
  const [value, setValue] = useState(target)
  const shown = useRef(target)

  useEffect(() => {
    const from = shown.current
    if (from === target) return
    let frame = 0
    if (reducedMotion()) {
      frame = requestAnimationFrame(() => {
        shown.current = target
        setValue(target)
      })
      return () => cancelAnimationFrame(frame)
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = (now - start) / durationMs
      const next = countUpValue(from, target, t)
      shown.current = next
      setValue(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return value
}
