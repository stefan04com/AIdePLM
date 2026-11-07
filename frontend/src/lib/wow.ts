// Numbers and steps behind the "wow" moments. Pure, so they're tested; sources in README.md.

import type { Run } from '../api/types'

/** Average creative review: eight days (Filestage, State of Creative Collaboration 2023). */
export const REVIEW_DAYS = 8
/** Average hours a hashtag stayed in Twitter's top 50 in 2016 (Lorenz-Spreen et al., 2019). */
export const TREND_LIFE_HOURS = 11.9

const HOUR_MS = 3_600_000

/** How many times faster than an eight-day review this run was approved. */
export function speedup(startIso: string, endIso: string): number {
  const ms = Math.max(1000, Date.parse(endIso) - Date.parse(startIso))
  return Math.round((REVIEW_DAYS * 24 * HOUR_MS) / ms)
}

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

/** How long "Post approved" stays on screen after a ship; everything after it waits for it. */
export const CELEBRATE_MS = 5000

/** After a ship: the caption starts rewriting itself once the celebration has gone. */
export const AFTER_SHIP_S = CELEBRATE_MS / 1000 + 0.4

/** The phone with the Slack notification slides in once the caption is rewriting. */
export const PHONE_AT_MS = CELEBRATE_MS + 1500

/** How long the phone stays; Adobee sits on it meanwhile. */
export const PHONE_SHOW_MS = 8000

/** Where the phone docks (px from the bottom-right corner) and its size; matches `.phone` in wow.css. */
export const PHONE_BOX = { right: 28, bottom: 24, width: 250, height: 500 } as const

/** Real public reviews the three personas are built from (data/reviews.csv). */
export const REAL_REVIEWS = 65

/** AdoBee's time as a share of an 8-day review, in percent ("to scale" note under the race). */
export function shareOfReview(startIso: string, endIso: string): number {
  return 100 / speedup(startIso, endIso)
}

/** Count-up value at `progress` (0..1), eased out so it slows down as it lands on `target`. */
export function countUp(target: number, progress: number): number {
  const p = Math.min(Math.max(progress, 0), 1)
  return target * (1 - (1 - p) ** 3)
}
