// The "Analysis" panel: every factor that decides whether the post ships, computed only from
// the run's real data. A factor without data yet shows "—", never an invented number.

import type { Run } from '../api/types'
import { formatUsd, MEASURED_IN_LIVE_EVAL } from './cost'
import { formatElapsed, formatSentiment } from './format'
import type { Tone } from './tones'

export interface Factor {
  label: string
  value: string
  detail: string
  /** 0..1 fill of the bar, or null for factors without a scale. */
  level: number | null
  tone: Tone
}

const EMPTY = (label: string, detail: string): Factor => ({
  label,
  value: '—',
  detail,
  level: null,
  tone: 'neutral',
})

function brandFit(run: Run | null): Factor {
  if (!run?.fit) return EMPTY('Brand fit', 'after the fit check')
  const { score, fits } = run.fit
  return {
    label: 'Brand fit',
    value: `${score}/100`,
    detail: fits ? 'fits the brand' : 'not a fit',
    level: score / 100,
    tone: fits ? 'ok' : 'bad',
  }
}

function audience(run: Run | null): Factor {
  const reactions = run?.reactions ?? []
  if (reactions.length === 0) return EMPTY('Audience', 'after persona reactions')
  const avg = reactions.reduce((sum, r) => sum + r.sentiment, 0) / reactions.length
  const engaging = reactions.filter((r) => r.would_engage).length
  return {
    label: 'Audience',
    value: formatSentiment(avg),
    detail: `${engaging}/${reactions.length} would engage`,
    level: (avg + 1) / 2,
    tone: avg >= 0 ? 'ok' : 'bad',
  }
}

function expertVoices(run: Run | null): Factor {
  const comments = run?.comments ?? []
  if (comments.length === 0) return EMPTY('Expert voices', 'after the first comment')
  const total = comments.reduce((sum, c) => sum + c.weight, 0)
  const verified = comments.filter((c) => c.industry_verified)
  const verifiedWeight = verified.reduce((sum, c) => sum + c.weight, 0)
  return {
    label: 'Expert voices',
    value: `${verified.length}/${comments.length} verified`,
    detail: `${Math.round((verifiedWeight / total) * 100)}% of the comment weight`,
    level: total > 0 ? verifiedWeight / total : 0,
    tone: verified.length > 0 ? 'ok' : 'neutral',
  }
}

function conflicts(run: Run | null): Factor {
  if (!run?.referee) return EMPTY('Conflicts', 'after the referee')
  const count = (status: string) =>
    run.referee!.comment_status.filter((s) => s.status === status).length
  const total = run.referee.conflicts.length
  return {
    label: 'Conflicts',
    value: String(total),
    detail: `${count('applied')} applied · ${count('in_conflict')} in conflict · ${count('rejected')} rejected`,
    level: null,
    tone: total > 0 ? 'warn' : 'ok',
  }
}

function timeToApproval(run: Run | null, nowMs: number): Factor {
  if (!run) return EMPTY('Time to approval', 'starts with the run')
  const shipped = run.shipped_at !== null
  return {
    label: 'Time to approval',
    value: formatElapsed(run.started_at, run.shipped_at ?? nowMs),
    detail: shipped ? 'approved' : 'running',
    level: null,
    tone: shipped ? 'ok' : 'neutral',
  }
}

function cost(run: Run | null, perPostUsd: number | null): Factor {
  if (!run) return EMPTY('Cost per post', 'after the run')
  // Same fallback as the cost panel: demo mode is cached, so show the live-eval measurement.
  const measured = perPostUsd ?? MEASURED_IN_LIVE_EVAL.perPostUsd
  return {
    label: 'Cost per post',
    value: formatUsd(measured),
    detail: perPostUsd === null ? 'measured in live eval' : 'measured on live AI calls',
    level: null,
    tone: 'neutral',
  }
}

export function computeFactors(run: Run | null, perPostUsd: number | null, nowMs: number) {
  return [
    brandFit(run),
    audience(run),
    expertVoices(run),
    conflicts(run),
    timeToApproval(run, nowMs),
    cost(run, perPostUsd),
  ]
}
