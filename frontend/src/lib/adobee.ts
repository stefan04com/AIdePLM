// Adobee, the busy robot bee: what it feels and says at each step of a run. Pure, so it's tested.

import type { Run } from '../api/types'

export type AdobeeMood = 'idle' | 'working' | 'curious' | 'alert' | 'happy' | 'sad'

export interface AdobeeState {
  mood: AdobeeMood
  message: string
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** Picks Adobee's mood and line from the run; `busy` covers a click still waiting for the API. */
export function adobeeState(run: Run | null, busy: boolean): AdobeeState {
  if (run?.step) return { mood: 'working', message: `Bzzz… ${run.step}` }
  if (busy) return { mood: 'working', message: 'Bzzz… on it.' }
  if (!run) {
    return { mood: 'idle', message: 'Bzz! I found a trend. Press Start run and I get to work.' }
  }

  switch (run.status) {
    case 'SPOTTED':
      return { mood: 'working', message: 'Checking if this trend fits the brand…' }
    case 'REJECTED':
      return { mood: 'sad', message: `Not our hive: ${run.fit?.reason ?? 'this trend does not fit.'}` }
    case 'DRAFTED':
      return { mood: 'curious', message: 'Draft ready! Ask the personas, then the reviewers.' }
    case 'IN_REVIEW': {
      const comments = run.comments.length
      if (comments === 0) {
        return { mood: 'curious', message: 'Waiting for Brand, Legal and Product to comment.' }
      }
      return {
        mood: 'curious',
        message: `${plural(comments, 'comment')} in. Run the referee when everyone has spoken.`,
      }
    }
    case 'REFEREED': {
      const conflicts = run.referee?.conflicts.length ?? 0
      if (conflicts === 0) return { mood: 'happy', message: 'No conflicts. Apply and ship it!' }
      return {
        mood: 'alert',
        message: `I found ${plural(conflicts, 'conflict')}. Check the compromise, then apply.`,
      }
    }
    case 'SHIPPED':
      return { mood: 'happy', message: 'Shipped! Sweet as honey. The team has it in Slack.' }
  }
}

/** Little lines for when someone clicks Adobee; cycles in order. */
export const ADOBEE_TIPS = [
  'I read every comment at once, so conflicts surface before the post goes out.',
  'My three personas come from 65 real coffee reviews.',
  'Legal no-gos always win, whoever asks.',
  'A verified coffee expert counts three times.',
  'Nothing ships until a human clicks apply.',
]

/** Where Adobee flies to: the part of the screen where the run is happening right now. */
export type AdobeeSpot = 'home' | 'spot' | 'draft' | 'review' | 'referee' | 'ship'

export function adobeeSpot(run: Run | null): AdobeeSpot {
  if (!run) return 'home'
  switch (run.status) {
    case 'SPOTTED':
    case 'REJECTED':
      return 'spot'
    case 'DRAFTED':
      return 'draft'
    case 'IN_REVIEW':
      return 'review'
    case 'REFEREED':
      return 'referee'
    case 'SHIPPED':
      return 'ship'
  }
}

/** The honeycomb in the header: one cell per step, filled with honey as the run gets there. */
export const HIVE_STEPS = ['Spot', 'Draft', 'Review', 'Referee', 'Ship'] as const

export type HiveCell = 'full' | 'current' | 'empty' | 'failed'

export function hiveCells(run: Run | null): HiveCell[] {
  const done: Record<Run['status'], number> = {
    SPOTTED: 0,
    REJECTED: 0,
    DRAFTED: 2,
    IN_REVIEW: 2,
    REFEREED: 4,
    SHIPPED: 5,
  }
  const filled = run ? done[run.status] : 0
  return HIVE_STEPS.map((_, i) => {
    if (run?.status === 'REJECTED' && i === 0) return 'failed'
    if (i < filled) return 'full'
    if (run && i === filled && run.status !== 'REJECTED') return 'current'
    return 'empty'
  })
}
