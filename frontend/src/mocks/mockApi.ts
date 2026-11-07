// In-browser fake backend with the Boabe demo scenario (see ./fixtures.ts).
// It mirrors backend/app/orchestrator.py: the same lifecycle
// (SPOTTED → DRAFTED → IN_REVIEW → REFEREED → SHIPPED), Run.step while a call runs,
// 409 when the run is busy or in the wrong status, 404 for unknown runs/conflicts,
// and comment weighting (docs/comment-weighting.md).

import { ApiError } from '../api/errors'
import type {
  ApplyRequest,
  CallUsage,
  Comment,
  CommentCreate,
  Draft,
  DemoModeResponse,
  Persona,
  PersonaReaction,
  Platform,
  PostingTime,
  RefereeResult,
  RegenerateRequest,
  Run,
  Trend,
  TrendScore,
  TrendScoreRequest,
  UsageSummary,
} from '../api/types'
import expertsJson from '../../../data/industry_experts.json'
import {
  COMMENT_HALF_LIFE_MS,
  type ExpertsFile,
  findVerifiedExpert,
  weight,
} from '../lib/weighting'
import { fixturePersonas as personas, fixtureRun as fixture } from './fixtures'

const experts = expertsJson as ExpertsFile

// Background "fit + draft" job: [delay from start in ms, step label]
const DRAFT_STEPS: [number, string][] = [
  [0, 'Checking brand fit…'],
  [1500, 'Drafting caption…'],
  [3000, 'Generating visual…'],
]
const DRAFT_DONE_MS = 4500
const SYNC_CALL_MS = 1200 // fake latency for /reactions, /referee and /apply

const runs = new Map<string, Run>()
let demoMode = true // the mock is always 'demo': canned, instant, offline

const clone = <T>(value: T): T => structuredClone(value)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const nowIso = () => new Date().toISOString()

function findRun(id: string): Run {
  const run = runs.get(id)
  if (!run) throw new ApiError(404, `Run ${id} not found`)
  return run
}

function requireStatus(run: Run, allowed: Run['status'][], action: string) {
  if (!allowed.includes(run.status)) {
    throw new ApiError(409, `Cannot ${action} a run in status ${run.status}`)
  }
}

export async function getTrend(which?: 'rejected'): Promise<Trend> {
  if (which) throw new ApiError(404, 'The rejected trend needs the real backend')
  return clone(fixture.trend)
}

export async function getPersonas(): Promise<Persona[]> {
  return clone(personas)
}

export async function createRun(trendId: string): Promise<Run> {
  if (trendId !== fixture.trend.id) throw new ApiError(404, `Trend ${trendId} not found`)

  const id = `run_mock_${Date.now().toString(36)}`
  const run: Run = {
    id,
    trend: clone(fixture.trend),
    fit: null,
    draft: null,
    reactions: [],
    comments: [],
    referee: null,
    status: 'SPOTTED',
    step: DRAFT_STEPS[0][1],
    started_at: nowIso(),
    shipped_at: null,
  }
  runs.set(id, run)

  for (const [delay, label] of DRAFT_STEPS.slice(1)) {
    setTimeout(() => {
      run.step = label
    }, delay)
  }
  setTimeout(() => {
    run.fit = clone(fixture.fit)
    // The fixture's image_url is a placeholder domain; null shows the visual_prompt box instead.
    run.draft = { ...clone(fixture.draft!), image_url: null }
    run.status = 'DRAFTED'
    run.step = null
  }, DRAFT_DONE_MS)

  return clone(run)
}

/** Copy of the run with comment weights at the current time, like the backend's get_run. */
function weighed(run: Run): Run {
  const now = new Date()
  const copy = clone(run)
  copy.comments = copy.comments.map((c) => ({
    ...c,
    weight: weight(c.industry_verified, new Date(c.created_at), now, COMMENT_HALF_LIFE_MS),
  }))
  return copy
}

export async function getRun(id: string): Promise<Run> {
  return weighed(findRun(id))
}

/** Marks the run busy with a step label while a synchronous call runs, like the backend. */
async function withStep<T>(run: Run, label: string, work: () => T): Promise<T> {
  if (run.step) throw new ApiError(409, `run is busy: ${run.step}`)
  run.step = label
  try {
    await sleep(SYNC_CALL_MS)
    return work()
  } finally {
    run.step = null
  }
}

export async function requestReactions(id: string): Promise<PersonaReaction[]> {
  const run = findRun(id)
  requireStatus(run, ['DRAFTED', 'IN_REVIEW'], 'request reactions for')
  return withStep(run, 'Customer personas are reacting…', () => {
    run.reactions = clone(fixture.reactions)
    run.status = 'IN_REVIEW'
    return clone(run.reactions)
  })
}

export async function addComment(id: string, body: CommentCreate): Promise<Comment> {
  const run = findRun(id)
  requireStatus(run, ['DRAFTED', 'IN_REVIEW', 'REFEREED'], 'comment on')
  const expert = findVerifiedExpert(body.author, experts)
  // Verified: the name as on the list; otherwise what was typed, with spaces tidied.
  const author = expert?.name ?? (body.author?.trim().split(/\s+/).join(' ') || null)
  const comment: Comment = {
    id: `c_${body.role}_${run.comments.length + 1}`,
    role: body.role,
    text: body.text,
    created_at: nowIso(),
    author,
    author_title: expert?.title ?? null,
    industry_verified: expert !== null,
    weight: 1,
  }
  run.comments.push(comment)
  run.status = 'IN_REVIEW' // REFEREED → IN_REVIEW on new comments
  return weighed(run).comments.at(-1)!
}

/** Maps a fixture comment id (c_legal) to the heaviest comment with that role (newest on a tie). */
function runCommentId(run: Run, fixtureCommentId: string): string | undefined {
  const role = fixture.comments.find((c) => c.id === fixtureCommentId)?.role
  const candidates = weighed(run).comments.filter((c) => c.role === role)
  return candidates.reduce<Comment | undefined>(
    (best, c) => (!best || c.weight >= best.weight ? c : best),
    undefined,
  )?.id
}

function refereeForRun(run: Run): RefereeResult {
  const result = clone(fixture.referee!)
  result.comment_status = result.comment_status.flatMap((status) => {
    const commentId = runCommentId(run, status.comment_id)
    return commentId ? [{ ...status, comment_id: commentId }] : []
  })
  result.edits = result.edits.map((edit) => ({
    ...edit,
    source_comment_id: runCommentId(run, edit.source_comment_id) ?? edit.source_comment_id,
  }))
  return result
}

export async function referee(id: string): Promise<RefereeResult> {
  const run = findRun(id)
  requireStatus(run, ['IN_REVIEW'], 'referee')
  return withStep(run, 'Referee is resolving the feedback…', () => {
    run.referee = refereeForRun(run)
    run.status = 'REFEREED'
    return clone(run.referee)
  })
}

/** Same rule as orchestrator._applied_draft: caption always, other edits only if accepted. */
function appliedDraft(draft: Draft, result: RefereeResult, acceptAllEdits: boolean): Draft {
  const next = { ...clone(draft), caption: result.final_caption, version: draft.version + 1 }
  if (!acceptAllEdits) return next
  for (const edit of result.edits) {
    if (edit.target === 'hashtags') next.hashtags = edit.after.split(/\s+/).filter(Boolean)
    if (edit.target === 'visual_prompt') next.visual_prompt = edit.after
  }
  return next
}

export async function apply(id: string, body: ApplyRequest): Promise<Run> {
  const run = findRun(id)
  requireStatus(run, ['REFEREED'], 'apply')
  const known = new Set(run.referee?.conflicts.map((c) => c.id))
  const unknown = (body.conflict_ids ?? []).filter((conflictId) => !known.has(conflictId))
  if (unknown.length > 0) throw new ApiError(404, `unknown conflict ids: ${unknown.join(', ')}`)

  await withStep(run, 'Applying changes…', () => {
    if (run.draft && run.referee) {
      run.draft = appliedDraft(run.draft, run.referee, body.accept_all_edits)
    }
    run.status = 'SHIPPED'
    run.shipped_at = nowIso()
  })
  return weighed(run) // after withStep, so the returned run is no longer busy
}

/** Like orchestrator.regenerate: keeps the person's edit, clears reactions and referee. */
export async function regenerate(id: string, body: RegenerateRequest): Promise<Run> {
  const run = findRun(id)
  requireStatus(run, ['DRAFTED', 'IN_REVIEW', 'REFEREED'], 'regenerate')
  if (!body.caption.trim() || !body.instruction.trim()) {
    throw new ApiError(422, 'caption and instruction must not be empty')
  }
  await withStep(run, 'Rewriting the caption…', () => {
    if (run.draft) {
      run.draft.caption = body.caption.trim()
      run.draft.regenerations = (run.draft.regenerations ?? 0) + 1
    }
    run.reactions = []
    run.referee = null
    run.status = 'DRAFTED'
  })
  return weighed(run)
}

export async function getTrendScore(body: TrendScoreRequest): Promise<TrendScore> {
  const tags = body.hashtags.filter((h) => h.trim())
  const score = Math.min(100, 30 + (tags.length >= 1 && tags.length <= 5 ? 10 : 0) + 20)
  return {
    score,
    suggestions: tags.length === 0 ? ['Add 2-3 specific hashtags.'] : ['Looks on trend.'],
  }
}

const MOCK_POSTING_TIME = 'Weekdays 08:00-11:00'

export async function getPostingTime(platform: Platform): Promise<PostingTime> {
  return {
    platform,
    time: MOCK_POSTING_TIME,
    reason: 'Mock answer: the real backend uses the rules in docs/what-makes-a-post-popular.md.',
  }
}

function mockCall(
  call: string,
  inputTokens: number,
  outputTokens: number,
  latencyMs: number,
  costUsd: number,
): CallUsage {
  return {
    call,
    model: 'mock',
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    latency_ms: latencyMs,
    cost_usd: costUsd,
  }
}

const MOCK_CALLS: CallUsage[] = [
  mockCall('fit', 820, 60, 1400, 0.003),
  mockCall('draft', 1100, 240, 2900, 0.007),
  mockCall('reactions', 1300, 310, 3100, 0.009),
  mockCall('referee', 2400, 650, 5200, 0.017),
]

const sumOf = (calls: CallUsage[], key: 'input_tokens' | 'output_tokens' | 'cost_usd') =>
  calls.reduce((sum, c) => sum + c[key], 0)

export async function getUsage(runId?: string): Promise<UsageSummary> {
  return {
    run_id: runId ?? null,
    calls: clone(MOCK_CALLS),
    total_input_tokens: sumOf(MOCK_CALLS, 'input_tokens'),
    total_output_tokens: sumOf(MOCK_CALLS, 'output_tokens'),
    total_cost_usd: sumOf(MOCK_CALLS, 'cost_usd'),
  }
}

export async function getDemoMode(): Promise<DemoModeResponse> {
  return { on: demoMode }
}

export async function setDemoMode(on: boolean): Promise<DemoModeResponse> {
  demoMode = on
  return { on: demoMode }
}
