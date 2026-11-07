// How the Trend score is read on screen. Pure, so it is tested. The backend scores the words and
// hashtags of the post against the saved trends and the popularity rules (call "trend_score").

import type { Draft } from '../api/types'

export type ScoreLevel = 'low' | 'medium' | 'high'

export const LEVEL_LABEL: Record<ScoreLevel, string> = {
  low: 'Low hype',
  medium: 'Some hype',
  high: 'High hype',
}

export const levelOf = (score: number): ScoreLevel => (score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low')

export const LEVEL_TONE = { low: 'bad', medium: 'warn', high: 'ok' } as const

/** What was scored: the caption and hashtags. Comparing two keys tells if the post changed since. */
export function scoredKey(draft: Pick<Draft, 'caption' | 'hashtags'>): string {
  return `${draft.caption.trim()}\n${draft.hashtags.join(' ')}`
}

/** The request body for the backend: the caption as the words, the hashtags as they are. */
export function toRequest(draft: Pick<Draft, 'caption' | 'hashtags'>) {
  return { words: draft.caption, hashtags: draft.hashtags }
}
