/** 4512000 → "1h 15m", 252000 → "4m 12s", 9000 → "9s". */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/** Time between two ISO datetimes; `end` is an ISO string or epoch ms and defaults to now. */
export function formatElapsed(startIso: string, end: string | number = Date.now()): string {
  const endMs = typeof end === 'number' ? end : Date.parse(end)
  return formatDuration(endMs - Date.parse(startIso))
}

/** "in_conflict" → "in conflict", "ready_to_ship" → "ready to ship". */
export function humanize(value: string): string {
  return value.replace(/_/g, ' ')
}

/** 0.4 → "+0.4", -0.5 → "-0.5". */
export function formatSentiment(sentiment: number): string {
  return `${sentiment > 0 ? '+' : ''}${sentiment.toFixed(1)}`
}
