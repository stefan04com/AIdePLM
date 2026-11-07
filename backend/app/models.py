"""Moment API contract. Mirrors ARCHITECTURE.md §5-§6; keep both in sync.

Conventions: snake_case JSON (no aliases), datetimes are ISO 8601 UTC strings.
After hour 1 do not rename/remove fields; adding optional fields is fine.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class Trend(BaseModel):
    id: str
    title: str
    source: Literal["reddit", "news", "saved"]
    url: str | None = None
    summary: str
    detected_at: datetime


class FitResult(BaseModel):
    fits: bool
    score: int = Field(ge=0, le=100)
    reason: str


class Draft(BaseModel):
    brief: str
    caption: str
    visual_prompt: str
    hashtags: list[str] = []
    image_url: str | None = None
    express_doc_id: str | None = None
    version: int = 1  # bumps on every apply
    regenerations: int = 0  # how many times the caption was rewritten with POST /regenerate


class Persona(BaseModel):
    id: str  # never equal to a Comment role ("brand", "legal", "product")
    name: str  # e.g. "Student night owl"
    segment: str
    cares_about: list[str]
    pet_peeves: list[str]
    sample_quotes: list[str]  # pulled from reviews.csv


class PersonaReaction(BaseModel):
    persona_id: str
    reaction: str
    sentiment: float = Field(ge=-1, le=1)
    would_engage: bool


class Comment(BaseModel):
    id: str
    role: Literal["brand", "legal", "product"]
    text: str
    created_at: datetime
    # Weighting (docs/comment-weighting.md). Optional and additive; set by the backend only.
    author: str | None = None
    author_title: str | None = None  # e.g. "Head barista", only for verified experts
    industry_verified: bool = False  # author is a verified expert in the brand's industry
    weight: float = 1.0  # expertise x recency, refreshed on every GET /runs/{id}


class ConflictParty(BaseModel):
    kind: Literal["human", "persona"]
    id: str  # comment role ("legal") or persona_id
    label: str  # display text, e.g. "Legal", "Student night owl"


class Conflict(BaseModel):
    id: str
    between: list[ConflictParty]
    summary: str
    positions: dict[str, str]  # keyed by ConflictParty.id
    compromise: str


class Edit(BaseModel):
    target: Literal["caption", "visual_prompt", "hashtags"]
    before: str  # for "hashtags": space-joined, e.g. "#a #b"
    after: str
    source_comment_id: str


class Task(BaseModel):
    owner: str
    task: str
    due: str


class CommentStatus(BaseModel):
    comment_id: str
    status: Literal["applied", "in_conflict", "rejected"]
    why: str


class RefereeResult(BaseModel):
    conflicts: list[Conflict]
    edits: list[Edit]
    tasks: list[Task]
    comment_status: list[CommentStatus]
    final_caption: str
    status: Literal["ready_to_ship", "needs_human"]


class Run(BaseModel):
    id: str
    trend: Trend
    fit: FitResult | None = None
    draft: Draft | None = None
    reactions: list[PersonaReaction] = []
    comments: list[Comment] = []
    referee: RefereeResult | None = None
    status: Literal["SPOTTED", "REJECTED", "DRAFTED", "IN_REVIEW", "REFEREED", "SHIPPED"]
    step: str | None = None  # human-readable current step while a background job runs
    started_at: datetime
    shipped_at: datetime | None = None
    # Set on ship: the Slack message was posted, simulated (no webhook) or failed.
    slack: Literal["posted", "simulated", "failed"] | None = None
    # LLM calls (fit, draft, reactions, referee) that fell back to canned content in live mode.
    fallback_calls: list[str] = []


# --- Request bodies -------------------------------------------------------


class CreateRunRequest(BaseModel):
    trend_id: str


class CommentCreate(BaseModel):
    role: Literal["brand", "legal", "product"]
    text: str
    author: str | None = Field(default=None, max_length=80)  # looked up in industry_experts.json


class ApplyRequest(BaseModel):
    conflict_ids: list[str] | None = None
    accept_all_edits: bool = False


class RegenerateRequest(BaseModel):
    caption: str = Field(min_length=1, max_length=2200)  # the caption as the person edited it
    instruction: str = Field(min_length=1, max_length=500)  # e.g. "make it shorter and warmer"


class HashtagsRequest(BaseModel):
    hashtags: list[str] = Field(max_length=30)  # the full list for the post, replaces the old one


Platform = Literal[
    "tiktok",
    "instagram_reels",
    "instagram_feed",
    "youtube_shorts",
    "facebook_reels",
    "facebook_feed",
    "x",
    "threads",
    "linkedin",
]


class TrendScoreRequest(BaseModel):
    words: str = Field(min_length=1, max_length=2200)
    hashtags: list[str] = Field(default=[], max_length=30)


class TrendScore(BaseModel):
    score: int = Field(ge=0, le=100)
    suggestions: list[str] = []


class PostingTime(BaseModel):
    platform: Platform
    time: str  # e.g. "Weekdays 08:00-11:00"
    reason: str
    confidence: Literal["high", "medium", "low"] | None = None  # None = guide fallback
    sources: list[str] = []  # report URLs behind the window


Weekday = Literal["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


class PostingWindow(BaseModel):
    days: list[Weekday]
    start: str  # "HH:MM", audience's local time
    end: str


class PostingSource(BaseModel):
    name: str
    url: str


class PostingWindows(BaseModel):
    """GET /posting-windows: the structured windows behind PostingTime, for the heatmap."""

    platform: str  # data key: "instagram", "facebook", "tiktok", "x", ...
    best_days: list[Weekday]  # strongest first
    windows: list[PostingWindow]
    reason: str
    confidence: Literal["high", "medium", "low"]
    sources: list[PostingSource]


class LiveTrends(BaseModel):
    """Current trends for the "Fetch current trends" button: saved from the web, not live."""

    source: Literal["saved", "live"]
    collected_at: str | None = None
    trends: list[Trend]


class DemoModeRequest(BaseModel):
    on: bool


class DemoModeResponse(BaseModel):
    on: bool


# --- Usage ----------------------------------------------------------------


class CallUsage(BaseModel):
    call: str
    model: str
    input_tokens: int
    output_tokens: int
    latency_ms: int
    cost_usd: float


class UsageSummary(BaseModel):
    run_id: str | None = None  # None = totals across all runs
    calls: list[CallUsage]
    total_input_tokens: int
    total_output_tokens: int
    total_cost_usd: float
