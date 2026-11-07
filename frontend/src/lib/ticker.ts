// Live cost ticker: one coin per LLM call, a total that counts up, and review hours saved.
// Pure logic, so `npm test` can run it in Node.

import type { CallUsage } from '../api/types'
import { DEMO_CACHE_MODEL } from './cost'

/**
 * ASSUMPTION, not a measurement: a typical content review takes 8 days (Filestage 2023 survey of
 * 366 marketers, vendor-reported; README "The problem"). We count 1 hour of reviewer time per
 * review day, so every post the Referee settles saves about 8 review hours.
 */
export const REVIEW_DAYS_PER_POST = 8
export const REVIEW_HOURS_PER_DAY = 1
export const REVIEW_HOURS_PER_POST = REVIEW_DAYS_PER_POST * REVIEW_HOURS_PER_DAY

export const ASSUMPTION_TEXT =
  `Assumption: a review takes ${REVIEW_DAYS_PER_POST} days (Filestage 2023, vendor-reported) ≈ ` +
  `${REVIEW_HOURS_PER_POST} reviewer hours per refereed post (${REVIEW_HOURS_PER_DAY} h a day).`

/** How many coins stay on the strip. */
export const COIN_LIMIT = 5
/** Count-up duration of the totals. */
export const COUNT_UP_MS = 900

export interface Coin {
  amount: string
  label: string
  cached: boolean
}

/** "+$0.012 · fit"; a demo-cache answer is "+$0.000 · cached". */
export function coinFor(call: CallUsage): Coin {
  const cached = call.model === DEMO_CACHE_MODEL
  const cost = cached ? 0 : call.cost_usd
  const digits = cost > 0 && cost < 0.001 ? 4 : 3
  return { amount: `+$${cost.toFixed(digits)}`, label: cached ? 'cached' : call.call, cached }
}

/** Reviewed posts = Referee calls logged (cached or live). */
export function hoursSaved(calls: CallUsage[]): number {
  return calls.filter((c) => c.call === 'referee').length * REVIEW_HOURS_PER_POST
}

/** Ease-out cubic value between `from` and `to` at progress t (0..1, clamped). */
export function countUpValue(from: number, to: number, t: number): number {
  const p = Math.min(Math.max(t, 0), 1)
  return from + (to - from) * (1 - (1 - p) ** 3)
}

/** Running total for the ticker: "$0.0602", never rounding a few tenths of a cent to $0. */
export function formatTicker(usd: number): string {
  return `$${usd.toFixed(usd < 1 ? 4 : 2)}`
}
