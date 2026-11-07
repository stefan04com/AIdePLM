import type { CommentStatus } from '../api/types'

/** Colour accent: components add the `tone-*` class and CSS reads var(--tone). */
export type Tone = 'neutral' | 'ok' | 'warn' | 'bad'

export const toneClass = (tone: Tone) => `tone-${tone}`

export const COMMENT_STATUS_TONE: Record<CommentStatus['status'], Tone> = {
  applied: 'ok',
  in_conflict: 'warn',
  rejected: 'bad',
}
