// The only module that talks to the backend. Components call these functions,
// never fetch() directly. With VITE_USE_MOCKS=true (default until the hour-4
// checkpoint) every call is served by ../mocks/mockApi.ts instead.

import * as mock from '../mocks/mockApi'
import { ApiError } from './errors'
import type {
  ApiErrorBody,
  ApplyRequest,
  Comment,
  CommentCreate,
  DemoModeResponse,
  Persona,
  PersonaReaction,
  RefereeResult,
  Run,
  Trend,
  UsageSummary,
} from './types'

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

const BASE = '/api' // Vite proxy rewrites /api/* → http://localhost:8000/*
const TIMEOUT_MS = 20_000 // backend calls are synchronous up to ~10s, plus margin

export { ApiError }

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    throw new ApiError(0, err instanceof Error ? err.message : 'Network error')
  }

  if (!res.ok) {
    let detail = res.statusText
    try {
      detail = ((await res.json()) as ApiErrorBody).detail ?? detail
    } catch {
      // body wasn't JSON; keep statusText
    }
    throw new ApiError(res.status, detail)
  }
  return (await res.json()) as T
}

export const api = {
  getTrend: (): Promise<Trend> => (USE_MOCKS ? mock.getTrend() : request('GET', '/trend')),

  getPersonas: (): Promise<Persona[]> =>
    USE_MOCKS ? mock.getPersonas() : request('GET', '/personas'),

  /** Returns immediately with status SPOTTED; poll getRun until DRAFTED or REJECTED. */
  createRun: (trendId: string): Promise<Run> =>
    USE_MOCKS ? mock.createRun(trendId) : request('POST', '/runs', { trend_id: trendId }),

  getRun: (id: string): Promise<Run> =>
    USE_MOCKS ? mock.getRun(id) : request('GET', `/runs/${encodeURIComponent(id)}`),

  requestReactions: (id: string): Promise<PersonaReaction[]> =>
    USE_MOCKS
      ? mock.requestReactions(id)
      : request('POST', `/runs/${encodeURIComponent(id)}/reactions`),

  addComment: (id: string, body: CommentCreate): Promise<Comment> =>
    USE_MOCKS
      ? mock.addComment(id, body)
      : request('POST', `/runs/${encodeURIComponent(id)}/comments`, body),

  referee: (id: string): Promise<RefereeResult> =>
    USE_MOCKS ? mock.referee(id) : request('POST', `/runs/${encodeURIComponent(id)}/referee`),

  apply: (id: string, body: ApplyRequest): Promise<Run> =>
    USE_MOCKS
      ? mock.apply(id, body)
      : request('POST', `/runs/${encodeURIComponent(id)}/apply`, body),

  getUsage: (runId?: string): Promise<UsageSummary> =>
    USE_MOCKS
      ? mock.getUsage(runId)
      : request('GET', runId ? `/usage?run_id=${encodeURIComponent(runId)}` : '/usage'),

  setDemoMode: (on: boolean): Promise<DemoModeResponse> =>
    USE_MOCKS ? mock.setDemoMode(on) : request('POST', '/admin/demo-mode', { on }),
}
