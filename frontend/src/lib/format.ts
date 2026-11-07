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

/** "in_conflict" → "in conflict", "ready_to_ship" → "ready to ship". */
export function humanize(value: string): string {
  return value.replace(/_/g, ' ')
}

/** 0.4 → "+0.4", -0.5 → "-0.5". */
export function formatSentiment(sentiment: number): string {
  return `${sentiment > 0 ? '+' : ''}${sentiment.toFixed(1)}`
}
