/** "1h 50m", "4m 12s" between two ISO datetimes (end defaults to now). */
export function formatElapsed(startIso: string, endIso?: string): string {
  const end = endIso ? Date.parse(endIso) : Date.now()
  const totalSeconds = Math.max(0, Math.round((end - Date.parse(startIso)) / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
