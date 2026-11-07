// Numbers and steps behind the "wow" moments. Pure, so they're tested; sources in README.md.

import type { Run } from '../api/types'

/** Average creative review: eight days (Filestage, State of Creative Collaboration 2023). */
export const REVIEW_DAYS = 8
/** Average hours a hashtag stayed in Twitter's top 50 in 2016 (Lorenz-Spreen et al., 2019). */
export const TREND_LIFE_HOURS = 11.9

const HOUR_MS = 3_600_000

/** Milliseconds of trend life left at `nowMs` (negative once the trend is past its peak). */
export function trendLifeLeft(detectedIso: string, nowMs: number): number {
  return TREND_LIFE_HOURS * HOUR_MS - (nowMs - Date.parse(detectedIso))
}

/** "9h 41m", "41m", "past its peak". */
export function formatLife(ms: number): string {
  if (ms <= 0) return 'past its peak'
  const minutes = Math.floor(ms / 60_000)
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

export type NextStep = 'start' | 'reactions' | 'comments' | 'referee' | 'apply' | null

/** What one press of the presenter key does next; null while the backend is busy. */
export function nextStep(run: Run | null): NextStep {
  if (!run || run.status === 'SHIPPED' || run.status === 'REJECTED') return 'start'
  if (run.step) return null
  switch (run.status) {
    case 'SPOTTED':
      return null
    case 'DRAFTED':
    case 'IN_REVIEW':
      if (run.reactions.length === 0) return 'reactions'
      if (run.comments.length < 3) return 'comments'
      return 'referee'
    case 'REFEREED':
      return 'apply'
  }
}
