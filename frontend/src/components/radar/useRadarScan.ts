import { useCallback, useEffect, useRef, useState } from 'react'
import { LOCK_MS, SWEEP_MS, ZOOM_MS } from '../../lib/radar'

/** idle = radar at rest, trend card shown normally. */
export type RadarPhase = 'idle' | 'sweep' | 'lock' | 'zoom'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The radar's timeline: sweep → lock on the current trend → zoom into the trend card → idle.
 * `scan` restarts it, `finish` jumps to the end (Start run calls it, so nothing ever waits on it).
 * `onZoom` runs as the zoom starts, so the caller can measure where the card should grow from.
 */
export function useRadarScan(onZoom: () => void) {
  const [phase, setPhase] = useState<RadarPhase>('idle')
  const [scanId, setScanId] = useState(0)
  const timers = useRef<number[]>([])
  const zoomRef = useRef(onZoom)
  useEffect(() => {
    zoomRef.current = onZoom
  }, [onZoom])

  const clear = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
  }

  const finish = useCallback(() => {
    clear()
    setPhase('idle')
  }, [])

  const scan = useCallback(() => {
    clear()
    setScanId((n) => n + 1)
    if (reducedMotion()) {
      setPhase('idle') // static radar: blips shown, current one marked, no sweep or zoom
      return
    }
    setPhase('sweep')
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
    at(SWEEP_MS, () => setPhase('lock'))
    at(SWEEP_MS + LOCK_MS, () => {
      zoomRef.current()
      setPhase('zoom')
    })
    at(SWEEP_MS + LOCK_MS + ZOOM_MS, () => setPhase('idle'))
  }, [])

  useEffect(() => clear, [])

  return { phase, scanId, scan, finish }
}
