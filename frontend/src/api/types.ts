// Hand-mirrored from backend/app/models.py (contract v1, feature/stefan-contract).
// Once the backend serves /openapi.json, run `npm run gen:types` and switch these
// to re-exports from ./schema.gen.ts. Do not rename fields: the contract is frozen.
// Conventions: snake_case, datetimes are ISO 8601 UTC strings.

export type IsoDateTime = string

export type TrendSource = 'reddit' | 'news' | 'saved'
export type CommentRole = 'brand' | 'legal' | 'product'
export type RunStatus = 'SPOTTED' | 'REJECTED' | 'DRAFTED' | 'IN_REVIEW' | 'REFEREED' | 'SHIPPED'

export interface Trend {
  id: string
  title: string
  source: TrendSource
  url: string | null
  summary: string
  detected_at: IsoDateTime
}

export interface FitResult {
  fits: boolean
  score: number // 0–100
  reason: string
}

export interface Draft {
  brief: string
  caption: string
  visual_prompt: string
  hashtags: string[]
  image_url: string | null
  express_doc_id: string | null
  version: number // bumps on every apply
  regenerations?: number // times the caption was rewritten with POST /runs/{id}/regenerate
}

export interface Persona {
  id: string // never equal to a CommentRole
  name: string
  segment: string
  cares_about: string[]
  pet_peeves: string[]
  sample_quotes: string[]
}

export interface PersonaReaction {
  persona_id: string
  reaction: string
  sentiment: number // -1..1
  would_engage: boolean
}

export interface Comment {
  id: string
  role: CommentRole
  text: string
  created_at: IsoDateTime
  // Weighting (docs/comment-weighting.md), set by the backend only.
  author: string | null
  author_title: string | null // e.g. "Head barista", only for verified experts
  industry_verified: boolean // verified expert in the brand's industry
  weight: number // expertise x recency, refreshed on every GET /runs/{id}
}

export interface ConflictParty {
  kind: 'human' | 'persona'
  id: string // CommentRole for humans, persona_id for personas
  label: string
}

export interface Conflict {
  id: string
  between: ConflictParty[]
  summary: string
  positions: Record<string, string> // keyed by ConflictParty.id
  compromise: string
}

export interface Edit {
  target: 'caption' | 'visual_prompt' | 'hashtags'
  before: string // for "hashtags": space-joined, e.g. "#a #b"
  after: string
  source_comment_id: string
}

export interface Task {
  owner: string
  task: string
  due: string
}

export interface CommentStatus {
  comment_id: string
  status: 'applied' | 'in_conflict' | 'rejected'
  why: string
}

export interface RefereeResult {
  conflicts: Conflict[]
  edits: Edit[]
  tasks: Task[]
  comment_status: CommentStatus[]
  final_caption: string
  status: 'ready_to_ship' | 'needs_human'
}

export interface Run {
  id: string
  trend: Trend
  fit: FitResult | null
  draft: Draft | null
  reactions: PersonaReaction[]
  comments: Comment[]
  referee: RefereeResult | null
  status: RunStatus
  step: string | null // loading label while a background job runs
  started_at: IsoDateTime
  shipped_at: IsoDateTime | null
  /** Set on ship: the Slack message was posted, simulated (no webhook) or failed. */
  slack?: SlackDelivery | null
  /** LLM calls that fell back to canned content in live mode (empty when all were real). */
  fallback_calls?: string[]
}

export type SlackDelivery = 'posted' | 'simulated' | 'failed'

// --- Request bodies ---------------------------------------------------------

export interface CreateRunRequest {
  trend_id: string
}

export interface CommentCreate {
  role: CommentRole
  text: string
  author?: string | null // looked up in data/industry_experts.json by the backend
}

export interface ApplyRequest {
  conflict_ids?: string[] | null
  accept_all_edits: boolean
}

export interface RegenerateRequest {
  caption: string // the caption as the person edited it
  instruction: string // e.g. "make it shorter and warmer"
}

export type Platform =
  | 'tiktok'
  | 'instagram_reels'
  | 'instagram_feed'
  | 'youtube_shorts'
  | 'facebook_reels'
  | 'facebook_feed'
  | 'x'
  | 'threads'
  | 'linkedin'

export interface TrendScoreRequest {
  words: string
  hashtags: string[]
}

export interface TrendScore {
  score: number // 0–100
  suggestions: string[]
}

export interface PostingTime {
  platform: Platform
  time: string // e.g. "Weekdays 08:00-11:00"
  reason: string
  /** From data/posting_windows.json; null when the backend used the guide's fallback rules. */
  confidence?: 'high' | 'medium' | 'low' | null
  sources?: string[] // report URLs behind the window
}

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

/** GET /posting-windows: the structured windows behind PostingTime (data/posting_windows.json). */
export interface PostingWindows {
  platform: string // data key: "instagram", "facebook", "tiktok", "x", "linkedin", ...
  best_days: Weekday[] // strongest first
  windows: { days: Weekday[]; start: string; end: string }[] // "HH:MM", audience's local time
  reason: string
  confidence: 'high' | 'medium' | 'low'
  sources: { name: string; url: string }[]
}

export type HashtagKind = 'broad' | 'niche' | 'local' | 'branded-generic'

export interface HashtagSuggestion {
  tag: string // "#pumpkinlatte"
  kind: HashtagKind
  topic: string
  evidence: string
  source_url: string
  source: 'saved'
}

/** GET /hashtags: suggestions from the saved, sourced cache (data/hashtags.json). */
export interface HashtagSuggestions {
  platform: string
  hashtags: HashtagSuggestion[]
  cap: number
  matched_topics: string[]
  collected_at: string | null
  source: 'saved'
  platform_note: string
  platform_source: string
}

/** GET /trends/live: current trends collected from the web; saved, not fetched live. */
export interface LiveTrends {
  source: 'saved' | 'live'
  collected_at: string | null
  trends: Trend[]
}

export interface DemoModeRequest {
  on: boolean
}

export interface DemoModeResponse {
  on: boolean
}

// --- Usage ------------------------------------------------------------------

export interface CallUsage {
  call: string
  model: string
  input_tokens: number
  output_tokens: number
  latency_ms: number
  cost_usd: number
}

export interface UsageSummary {
  run_id: string | null // null = totals across all runs
  calls: CallUsage[]
  total_input_tokens: number
  total_output_tokens: number
  total_cost_usd: number
}

/** Shape of every backend error (HTTPException). 404 unknown run, 409 bad transition. */
export interface ApiErrorBody {
  detail: string
}
