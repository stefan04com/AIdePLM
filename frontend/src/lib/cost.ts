// Cost numbers for the cost panel and the cost slide ("$X per post"), from GET /usage.
// Demo-mode calls are answered from the cache (model "demo-cache", $0), so the cost per post
// is estimated from the *live* calls only. No value imports, so `npm test` can run it in Node.

import type { CallUsage } from '../api/types'

export const DEMO_CACHE_MODEL = 'demo-cache'

export const isLiveCall = (call: CallUsage) => call.model !== DEMO_CACHE_MODEL

export interface PostCostEstimate {
  /** Sum over call types (fit, draft, reactions, referee…) of their average live cost. */
  perPostUsd: number
  /** How many live calls the estimate is based on (0 = no estimate). */
  liveCalls: number
  /** Average latency of one post's calls added up, in ms. */
  perPostLatencyMs: number
}

const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length

/** Estimate for one post from every logged call; null when no live call was logged yet. */
export function estimatePostCost(calls: CallUsage[]): PostCostEstimate | null {
  const live = calls.filter(isLiveCall)
  if (live.length === 0) return null

  const byType = new Map<string, CallUsage[]>()
  for (const call of live) byType.set(call.call, [...(byType.get(call.call) ?? []), call])

  const types = [...byType.values()]
  return {
    perPostUsd: types.reduce((sum, group) => sum + average(group.map((c) => c.cost_usd)), 0),
    liveCalls: live.length,
    perPostLatencyMs: types.reduce((sum, group) => sum + average(group.map((c) => c.latency_ms)), 0),
  }
}

/** $0.0042 for small amounts (so they don't round to $0.00), $1.25 otherwise. */
export function formatUsd(value: number): string {
  if (value === 0) return '$0'
  return `$${value.toFixed(value < 0.1 ? 4 : 2)}`
}
