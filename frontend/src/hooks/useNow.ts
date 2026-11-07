import { useEffect, useState } from 'react'

/** Current time in epoch ms, refreshed every second while `active`, for live clocks. */
export function useNow(active = true, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [active, intervalMs])

  return now
}
