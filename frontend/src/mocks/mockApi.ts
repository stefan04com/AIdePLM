// In-browser fake backend built from backend/tests/fixtures/run_refereed.json.
// It mimics the real lifecycle (SPOTTED → DRAFTED → IN_REVIEW → REFEREED → SHIPPED),
// including Run.step labels and 404/409 errors, so the UI can be built before hour 4.

import { ApiError } from '../api/errors'
import type {
  ApplyRequest,
  CallUsage,
  Comment,
  CommentCreate,
  DemoModeResponse,
  Persona,
  PersonaReaction,
  RefereeResult,
  Run,
  Trend,
  UsageSummary,
} from '../api/types'
import { fixturePersonas as personas, fixtureRun as fixture } from './fixtures'

// Background "fit + draft" job: [delay from start in ms, step label]
const DRAFT_STEPS: [number, string][] = [
  [0, 'Checking brand fit…'],
  [1500, 'Drafting caption…'],
  [3000, 'Generating visual…'],
]
const DRAFT_DONE_MS = 4500
const SYNC_CALL_MS = 1200 // fake latency for /reactions and /referee

const runs = new Map<string, Run>()
let demoMode = false

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

export async function getTrend(): Promise<Trend> {
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

export async function getRun(id: string): Promise<Run> {
  return clone(findRun(id))
}

export async function requestReactions(id: string): Promise<PersonaReaction[]> {
  const run = findRun(id)
  requireStatus(run, ['DRAFTED', 'IN_REVIEW'], 'request reactions for')
  await sleep(SYNC_CALL_MS)
  run.reactions = clone(fixture.reactions)
  run.status = 'IN_REVIEW'
  return clone(run.reactions)
}

export async function addComment(id: string, body: CommentCreate): Promise<Comment> {
  const run = findRun(id)
  requireStatus(run, ['DRAFTED', 'IN_REVIEW', 'REFEREED'], 'comment on')
  const comment: Comment = {
    id: `c_${body.role}_${run.comments.length + 1}`,
    role: body.role,
    text: body.text,
    created_at: nowIso(),
  }
  run.comments.push(comment)
  run.status = 'IN_REVIEW' // REFEREED → IN_REVIEW on new comments
  return clone(comment)
}

export async function referee(id: string): Promise<RefereeResult> {
  const run = findRun(id)
  requireStatus(run, ['IN_REVIEW', 'REFEREED'], 'referee')
  await sleep(SYNC_CALL_MS)
  const result = clone(fixture.referee as RefereeResult)
  // Point comment_status at the ids this run actually has, matching by role.
  result.comment_status = result.comment_status.flatMap((status) => {
    const role = fixture.comments.find((c) => c.id === status.comment_id)?.role
    const match = run.comments.find((c) => c.role === role)
    return match ? [{ ...status, comment_id: match.id }] : []
  })
  run.referee = result
  run.status = 'REFEREED'
  return clone(result)
}

export async function apply(id: string, body: ApplyRequest): Promise<Run> {
  const run = findRun(id)
  requireStatus(run, ['REFEREED'], 'apply')
  if (run.draft && run.referee) {
    run.draft.caption = run.referee.final_caption
    if (body.accept_all_edits) {
      const tags = run.referee.edits.find((e) => e.target === 'hashtags')
      if (tags) run.draft.hashtags = tags.after.split(' ').filter(Boolean)
    }
    run.draft.version += 1
  }
  run.status = 'SHIPPED'
  run.shipped_at = nowIso()
  return clone(run)
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

export async function setDemoMode(on: boolean): Promise<DemoModeResponse> {
  demoMode = on
  return { on: demoMode }
}
