// The only module that talks to the backend. Components use `api`, never fetch() directly.
// With VITE_USE_MOCKS=true (default until the hour-4 checkpoint) `api` is the in-browser
// mock from ../mocks/mockApi.ts, which implements the same functions.

import * as mockApi from '../mocks/mockApi'
import { ApiError } from './errors'
import type {
  ApiErrorBody,
  ApplyRequest,
  Comment,
  CommentCreate,
  DemoModeResponse,
  Persona,
  PersonaReaction,
  Platform,
  PostingTime,
  RefereeResult,
  RegenerateRequest,
  Run,
  Trend,
  HashtagSuggestions,
  TrendScore,
  TrendScoreRequest,
  UsageSummary,
} from './types'

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

const BASE = '/api' // Vite proxy rewrites /api/* → http://localhost:8000/*
const TIMEOUT_MS = 20_000 // /reactions and /referee are synchronous up to ~10s, plus margin

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const hasBody = body !== undefined
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method,
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    throw new ApiError(0, err instanceof Error ? err.message : 'Network error')
  }
  if (!res.ok) throw new ApiError(res.status, await readDetail(res))
  return (await res.json()) as T
}

/** Reads FastAPI's {"detail": "..."} error body, falling back to the HTTP status text. */
async function readDetail(res: Response): Promise<string> {
  try {
    return ((await res.json()) as ApiErrorBody).detail ?? res.statusText
  } catch {
    return res.statusText
  }
}

const get = <T>(path: string) => request<T>('GET', path)
const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body)
const runPath = (id: string, suffix = '') => `/runs/${encodeURIComponent(id)}${suffix}`

const backendApi = {
  /** The saved demo trend, or with 'rejected' the risky one the fit check turns down. */
  getTrend: (which?: 'rejected') => get<Trend>(which ? '/trend?which=rejected' : '/trend'),
  getPersonas: () => get<Persona[]>('/personas'),
  /** Returns immediately with status SPOTTED; poll getRun until DRAFTED or REJECTED. */
  createRun: (trendId: string) => post<Run>('/runs', { trend_id: trendId }),
  getRun: (id: string) => get<Run>(runPath(id)),
  requestReactions: (id: string) => post<PersonaReaction[]>(runPath(id, '/reactions')),
  addComment: (id: string, body: CommentCreate) => post<Comment>(runPath(id, '/comments'), body),
  referee: (id: string) => post<RefereeResult>(runPath(id, '/referee')),
  apply: (id: string, body: ApplyRequest) => post<Run>(runPath(id, '/apply'), body),
  /** Rewrites the edited caption; the review restarts (status DRAFTED, reactions cleared). */
  regenerate: (id: string, body: RegenerateRequest) => post<Run>(runPath(id, '/regenerate'), body),
  /** Replaces the post's hashtags; no AI call, the review keeps its answers. */
  setHashtags: (id: string, hashtags: string[]) =>
    post<Run>(runPath(id, '/hashtags'), { hashtags }),
  getHashtagSuggestions: (keywords: string[], platform: string) =>
    get<HashtagSuggestions>(
      `/hashtag-suggestions?platform=${encodeURIComponent(platform)}` +
        keywords.map((k) => `&keywords=${encodeURIComponent(k)}`).join(''),
    ),
  getTrendScore: (body: TrendScoreRequest) => post<TrendScore>('/trend-score', body),
  getPostingTime: (platform: Platform) =>
    get<PostingTime>(`/posting-time?platform=${encodeURIComponent(platform)}`),
  getUsage: (runId?: string) =>
    get<UsageSummary>(runId ? `/usage?run_id=${encodeURIComponent(runId)}` : '/usage'),
  getDemoMode: () => get<DemoModeResponse>('/admin/demo-mode'),
  setDemoMode: (on: boolean) => post<DemoModeResponse>('/admin/demo-mode', { on }),
}

export type Api = typeof backendApi

export const api: Api = USE_MOCKS ? mockApi : backendApi
